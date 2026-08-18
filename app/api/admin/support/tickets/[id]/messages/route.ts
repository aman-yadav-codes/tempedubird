import { createHash } from "crypto";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { canAccessInstitution } from "@/lib/auth/institution-scope";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { NotificationService } from "@/services/notificationService";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1";
const MAX_ATTACHMENTS = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PDF_SIZE = 10 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

type UploadedAttachment = {
  file_name: string;
  file_url: string;
  public_id: string;
  resource_type: string;
};

function createSignature(params: Record<string, string | number>, apiSecret: string) {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1").update(`${serialized}${apiSecret}`).digest("hex");
}

function validateAttachment(file: File) {
  if (!ACCEPTED_ATTACHMENT_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, WebP, GIF and PDF attachments are allowed");
  }
  const maxSize = file.type === "application/pdf" ? MAX_PDF_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    throw new Error(
      file.type === "application/pdf"
        ? "PDF attachments must be 10MB or smaller"
        : "Image attachments must be 5MB or smaller"
    );
  }
}

async function uploadAttachment(file: File): Promise<UploadedAttachment> {
  validateAttachment(file);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = "support_ticket_attachments";
  const signature = createSignature({ folder, timestamp }, apiSecret);
  const uploadFormData = new FormData();
  uploadFormData.append("file", file);
  uploadFormData.append("api_key", apiKey);
  uploadFormData.append("timestamp", String(timestamp));
  uploadFormData.append("folder", folder);
  uploadFormData.append("signature", signature);

  const uploadResponse = await fetch(
    `${CLOUDINARY_UPLOAD_URL}/${cloudName}/auto/upload`,
    { method: "POST", body: uploadFormData }
  );
  const uploadJson = await uploadResponse.json();
  if (!uploadResponse.ok) {
    throw new Error(uploadJson.error?.message ?? `Failed to upload ${file.name}`);
  }

  return {
    file_name: file.name.slice(0, 255),
    file_url: uploadJson.secure_url,
    public_id: uploadJson.public_id,
    resource_type: uploadJson.resource_type,
  };
}

async function deleteUploadedAttachment(attachment: UploadedAttachment) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret || !attachment.public_id) return;

  const timestamp = Math.round(Date.now() / 1000);
  const signature = createSignature(
    { public_id: attachment.public_id, timestamp },
    apiSecret
  );
  const formData = new FormData();
  formData.append("public_id", attachment.public_id);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  await fetch(
    `${CLOUDINARY_UPLOAD_URL}/${cloudName}/${attachment.resource_type}/destroy`,
    { method: "POST", body: formData }
  ).catch(() => undefined);
}

async function getTicketId(ctx: RouteContext) {
  const { id } = await ctx.params;
  const ticketId = Number(id);
  if (!Number.isInteger(ticketId) || ticketId <= 0) throw new Error("Invalid ticket id");
  return ticketId;
}

async function assertCanAccessTicket(user: Awaited<ReturnType<typeof requireAdmin>>, ticketId: number) {
  if (!["support.tickets.view", "student.support.view", "teacher.support.view", "parents.support.view", "driver.support.view"]
    .some((permission) => hasPermission(user, permission))) {
    throw new Error("Forbidden: Support access required");
  }
  const result = await db.query<{ institution_id: number | null; created_by: number; status: string; creator_is_admin: boolean }>(
    `SELECT t.institution_id, t.created_by, t.status,
            EXISTS (
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
              INNER JOIN roles r ON r.id = creator_roles.role_id
              WHERE r.code IN ('institution_admin', 'platform_admin')
            ) AS creator_is_admin
       FROM support_tickets t
       LEFT JOIN institution_profiles ip ON ip.id = t.institution_id
      WHERE t.id = $1
        AND COALESCE(t.is_deleted, FALSE) = FALSE
        AND (
          t.institution_id IS NULL
          OR (
            ip.is_active = TRUE
            AND COALESCE(ip.is_deleted, FALSE) = FALSE
          )
        )`,
    [ticketId]
  );
  const ticket = result.rows[0];
  if (!ticket) throw new Error("Ticket not found");
  if (isPlatformAdminUser(user)) {
    if (ticket.creator_is_admin || ticket.created_by === user.id) return ticket;
    throw new Error("Forbidden: Institution members receive support from their institution admin");
  }
  if (ticket.created_by === user.id) return ticket;
  if (user.role_codes.includes("institution_admin") && canAccessInstitution(user, ticket.institution_id)) return ticket;
  throw new Error("Forbidden: Support ticket access denied");
}

async function assertReplyMessage(
  ticketId: number,
  replyToMessageId: number | null,
  canSeeInternal: boolean
) {
  if (!replyToMessageId) return null;
  const result = await db.query<{ id: number }>(
    `
      SELECT id
      FROM support_ticket_messages
      WHERE id = $1
        AND ticket_id = $2
        AND COALESCE(is_deleted, FALSE) = FALSE
        AND ($3::boolean = TRUE OR is_internal = FALSE)
    `,
    [replyToMessageId, ticketId, canSeeInternal]
  );
  if (!result.rows[0]) throw new Error("Reply message not found");
  return result.rows[0].id;
}

function getPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function ensureSupportReplyTemplate() {
  await db.query(
    `
      INSERT INTO notification_templates (code, title_template, body_template, is_active, updated_at)
      VALUES (
        'support.new_message',
        'New support message',
        '{{actor_name}} replied to {{ticket_number}}: {{message_preview}}',
        TRUE,
        NOW()
      )
      ON CONFLICT (code) DO UPDATE
      SET body_template = EXCLUDED.body_template,
          updated_at = NOW()
      WHERE notification_templates.body_template = '{{actor_name}} replied to {{ticket_number}}.'
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

async function notifySupportReply(
  user: Awaited<ReturnType<typeof requireAdmin>>,
  ticketId: number,
  message: string
) {
  const ticketResult = await db.query<{
    id: number;
    ticket_number: string;
    institution_id: number | null;
    created_by: number;
    subject: string;
  }>(
    `SELECT id, ticket_number, institution_id, created_by, subject
     FROM support_tickets
     WHERE id = $1
       AND COALESCE(is_deleted, FALSE) = FALSE`,
    [ticketId]
  );
  const ticket = ticketResult.rows[0];
  if (!ticket) return;

  const creatorRoleResult = await db.query<{ code: string }>(
    `SELECT DISTINCT r.code
       FROM roles r
       INNER JOIN (
         SELECT ur.role_id
         FROM user_roles ur
         WHERE ur.user_id = $1
         UNION
         SELECT im.role_id
         FROM institution_memberships im
         WHERE im.user_id = $1
           AND im.institution_id = $2
           AND im.is_active = TRUE
           AND COALESCE(im.is_deleted, FALSE) = FALSE
       ) creator_roles ON creator_roles.role_id = r.id`,
    [ticket.created_by, ticket.institution_id]
  );
  const creatorIsInstitutionAdmin = creatorRoleResult.rows.some((row) => row.code === "institution_admin");
  const actorIsInstitutionAdmin = user.role_codes.includes("institution_admin");
  const recipients = isPlatformAdminUser(user)
    ? [ticket.created_by]
    : actorIsInstitutionAdmin && creatorIsInstitutionAdmin
      ? await getPlatformAdminIds()
      : actorIsInstitutionAdmin
        ? [ticket.created_by]
        : await getInstitutionAdminIds(ticket.institution_id);
  const recipientIds = recipients.filter((recipientId) => recipientId !== user.id);
  if (!recipientIds.length) return;

  await ensureSupportReplyTemplate();
  await new NotificationService(db).create({
    type: "support.new_message",
    recipients: recipientIds,
    institutionId: ticket.institution_id,
    entityType: "support_ticket",
    entityId: ticket.id,
    createdBy: user.id,
    payload: {
      actor_name: user.full_name,
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      message_preview: message.slice(0, 120),
      url: `/admin/support?ticket=${ticket.id}`,
    },
  });
}

export async function GET(req: Request, ctx: RouteContext) {
  try {
    const user = await requireAdmin(req);
    const ticketId = await getTicketId(ctx);
    await assertCanAccessTicket(user, ticketId);
    const url = new URL(req.url);
    const limit = Math.min(getPositiveInt(url.searchParams.get("limit"), 20), 50);
    const beforeId = Number(url.searchParams.get("before_id"));
    const hasBeforeId = Number.isInteger(beforeId) && beforeId > 0;
    const requestedMessageId = Number(url.searchParams.get("message_id"));
    const messageId =
      Number.isInteger(requestedMessageId) && requestedMessageId > 0
        ? requestedMessageId
        : null;

    const result = await db.query(
      `
        SELECT *
        FROM (
          SELECT
            m.id,
            m.ticket_id,
            m.user_id,
            u.full_name AS user_name,
            COALESCE(
              (
                SELECT role.name
                FROM institution_memberships membership
                INNER JOIN roles role ON role.id = membership.role_id
                WHERE membership.user_id = m.user_id
                  AND membership.institution_id = message_ticket.institution_id
                  AND membership.is_active = TRUE
                  AND membership.is_current = TRUE
                  AND COALESCE(membership.is_deleted, FALSE) = FALSE
                ORDER BY CASE role.code
                  WHEN 'institution_admin' THEN 1
                  WHEN 'teacher' THEN 2
                  WHEN 'student' THEN 3
                  WHEN 'parent' THEN 4
                  WHEN 'driver' THEN 5
                  ELSE 10
                END
                LIMIT 1
              ),
              (
                SELECT role.name
                FROM user_roles user_role
                INNER JOIN roles role ON role.id = user_role.role_id
                WHERE user_role.user_id = m.user_id
                ORDER BY CASE role.code WHEN 'platform_admin' THEN 1 ELSE 10 END
                LIMIT 1
              )
            ) AS user_role_name,
            m.message,
            m.is_internal,
            m.reply_to_message_id,
            m.edited_at,
            m.created_at,
            m.event_type,
            m.legacy_call_id,
            m.call_status,
            m.call_answered_by,
            m.call_answered_at,
            m.call_ended_at,
            m.call_duration_seconds,
            m.call_end_reason,
            CASE
              WHEN reply_message.id IS NULL THEN NULL
              ELSE json_build_object(
                'id', reply_message.id,
                'user_id', reply_message.user_id,
                'user_name', reply_user.full_name,
                'message', reply_message.message,
                'has_attachments', EXISTS (
                  SELECT 1
                  FROM support_ticket_attachments reply_attachment
                  WHERE reply_attachment.ticket_message_id = reply_message.id
                )
              )
            END AS replied_message,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', a.id,
                    'file_name', a.file_name,
                    'file_url', a.file_url,
                    'uploaded_at', a.uploaded_at
                  )
                  ORDER BY a.id
                )
                FROM support_ticket_attachments a
                WHERE a.ticket_message_id = m.id
              ),
              '[]'::json
            ) AS attachments
          FROM support_ticket_messages m
          INNER JOIN support_tickets message_ticket ON message_ticket.id = m.ticket_id
          INNER JOIN users u ON u.id = m.user_id
          LEFT JOIN support_ticket_messages reply_message
            ON reply_message.id = m.reply_to_message_id
           AND reply_message.ticket_id = m.ticket_id
           AND COALESCE(reply_message.is_deleted, FALSE) = FALSE
           AND ($2::boolean = TRUE OR reply_message.is_internal = FALSE)
          LEFT JOIN users reply_user ON reply_user.id = reply_message.user_id
          WHERE m.ticket_id = $1
            AND COALESCE(m.is_deleted, FALSE) = FALSE
            AND ($2::boolean = TRUE OR m.is_internal = FALSE)
            AND (
              $3::bigint IS NULL
              OR (m.created_at, m.id) < (
                SELECT cursor.created_at, cursor.id
                FROM support_ticket_messages cursor
                WHERE cursor.id = $3::bigint
                  AND cursor.ticket_id = $1
              )
            )
            AND ($5::bigint IS NULL OR m.id = $5::bigint)
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT $4
        ) latest_messages
        ORDER BY created_at ASC, id ASC
      `,
      [
        ticketId,
        isPlatformAdminUser(user),
        messageId ? null : hasBeforeId ? beforeId : null,
        messageId ? 1 : limit + 1,
        messageId,
      ]
    );
    const rows = messageId ? result.rows : result.rows.slice(-limit);

    return NextResponse.json({
      data: rows,
      hasMore: messageId ? false : result.rows.length > limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load ticket messages";
    return NextResponse.json({ error: message }, { status: message.includes("Forbidden") ? 403 : message.includes("not found") ? 404 : 400 });
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  let uploadedAttachments: UploadedAttachment[] = [];
  try {
    const user = await requireAdmin(req);
    const ticketId = await getTicketId(ctx);
    const ticket = await assertCanAccessTicket(user, ticketId);
    const contentType = req.headers.get("content-type") ?? "";
    let message = "";
    let isInternal = false;
    let replyToMessageId: number | null = null;
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      message = String(formData.get("message") ?? "").trim();
      isInternal =
        String(formData.get("is_internal") ?? "") === "true" &&
        isPlatformAdminUser(user);
      const requestedReplyId = Number(formData.get("reply_to_message_id"));
      replyToMessageId =
        Number.isInteger(requestedReplyId) && requestedReplyId > 0
          ? requestedReplyId
          : null;
      files = formData
        .getAll("files")
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    } else {
      const body = await req.json();
      message = typeof body.message === "string" ? body.message.trim() : "";
      isInternal = Boolean(body.is_internal) && isPlatformAdminUser(user);
      const requestedReplyId = Number(body.reply_to_message_id);
      replyToMessageId =
        Number.isInteger(requestedReplyId) && requestedReplyId > 0
          ? requestedReplyId
          : null;
    }

    if (!message && files.length === 0) {
      return NextResponse.json(
        { error: "Write a message or add an attachment" },
        { status: 422 }
      );
    }
    if (files.length > MAX_ATTACHMENTS) {
      return NextResponse.json(
        { error: `A maximum of ${MAX_ATTACHMENTS} attachments is allowed` },
        { status: 422 }
      );
    }
    if (ticket.status === "closed") {
      return NextResponse.json({ error: "This ticket is closed and cannot receive new replies" }, { status: 409 });
    }
    replyToMessageId = await assertReplyMessage(
      ticketId,
      replyToMessageId,
      isPlatformAdminUser(user)
    );

    const uploadResults = await Promise.allSettled(files.map(uploadAttachment));
    uploadedAttachments = uploadResults.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    );
    const failedUpload = uploadResults.find(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );
    if (failedUpload) {
      await Promise.all(uploadedAttachments.map(deleteUploadedAttachment));
      uploadedAttachments = [];
      throw failedUpload.reason;
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `
          INSERT INTO support_ticket_messages (
            ticket_id,
            user_id,
            message,
            is_internal,
            reply_to_message_id,
            event_type
          )
          VALUES ($1, $2, $3, $4, $5, 'message')
          RETURNING *
        `,
        [ticketId, user.id, message, isInternal, replyToMessageId]
      );
      const ticketMessageId = result.rows[0].id;

      if (uploadedAttachments.length > 0) {
        await client.query(
          `
            INSERT INTO support_ticket_attachments (
              ticket_message_id,
              file_name,
              file_url,
              uploaded_by
            )
            SELECT
              $1,
              attachment->>'file_name',
              attachment->>'file_url',
              $2
            FROM jsonb_array_elements($3::jsonb) AS attachment
          `,
          [ticketMessageId, user.id, JSON.stringify(uploadedAttachments)]
        );
      }

      await client.query(
        `UPDATE support_tickets SET updated_at = NOW() WHERE id = $1`,
        [ticketId]
      );
      await client.query(
        `
          INSERT INTO support_ticket_history (ticket_id, action, new_value, performed_by)
          VALUES ($1, 'message.added', $2, $3)
        `,
        [
          ticketId,
          uploadedAttachments.length > 0
            ? `${isInternal ? "internal" : "public"}:${uploadedAttachments.length}_attachment(s)`
            : isInternal
              ? "internal"
              : "public",
          user.id,
        ]
      );
      await client.query("COMMIT");

      const responseAttachments = uploadedAttachments.map((attachment, index) => ({
        id: `${ticketMessageId}-${index}`,
        file_name: attachment.file_name,
        file_url: attachment.file_url,
      }));
      const attachmentCount = uploadedAttachments.length;
      uploadedAttachments = [];

      try {
        await notifySupportReply(
          user,
          ticketId,
          message || `Sent ${attachmentCount} attachment(s)`
        );
      } catch (notificationError) {
        console.error("[support.reply.notification]", notificationError);
      }

      return NextResponse.json(
        {
          data: {
            ...result.rows[0],
            user_name: user.full_name,
            user_role_name: user.role_codes[0]?.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) ?? null,
            attachments: responseAttachments,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      await client.query("ROLLBACK");
      await Promise.all(uploadedAttachments.map(deleteUploadedAttachment));
      uploadedAttachments = [];
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    if (uploadedAttachments.length > 0) {
      await Promise.all(uploadedAttachments.map(deleteUploadedAttachment));
    }
    const message = err instanceof Error ? err.message : "Failed to add ticket message";
    return NextResponse.json(
      { error: message },
      {
        status: message.includes("Forbidden")
          ? 403
          : message.includes("not found")
            ? 404
            : message.includes("allowed") ||
                message.includes("smaller") ||
                message.includes("maximum")
              ? 422
              : 400,
      }
    );
  }
}

export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const user = await requireAdmin(req);
    const ticketId = await getTicketId(ctx);
    const ticket = await assertCanAccessTicket(user, ticketId);
    const body = await req.json();
    const messageId = Number(body.id);
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!Number.isInteger(messageId) || messageId <= 0 || !message) {
      return NextResponse.json(
        { error: "Message id and message are required" },
        { status: 422 }
      );
    }
    if (ticket.status === "closed") {
      return NextResponse.json(
        { error: "Messages in a closed ticket cannot be edited" },
        { status: 409 }
      );
    }

    const result = await db.query(
      `
        UPDATE support_ticket_messages
        SET message = $4,
            edited_at = NOW()
        WHERE id = $1
          AND ticket_id = $2
          AND user_id = $3
          AND event_type = 'message'
        RETURNING id, message, edited_at
      `,
      [messageId, ticketId, user.id, message]
    );
    if (!result.rows[0]) {
      return NextResponse.json(
        { error: "You can only edit your own messages" },
        { status: 403 }
      );
    }

    await db.query(
      `
        INSERT INTO support_ticket_history (ticket_id, action, new_value, performed_by)
        VALUES ($1, 'message.edited', $2, $3)
      `,
      [ticketId, String(messageId), user.id]
    );
    await db.query(
      `UPDATE support_tickets SET updated_at = NOW() WHERE id = $1`,
      [ticketId]
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to edit message";
    return NextResponse.json(
      { error: message },
      {
        status: message.includes("Forbidden")
          ? 403
          : message.includes("not found")
            ? 404
            : 400,
      }
    );
  }
}
