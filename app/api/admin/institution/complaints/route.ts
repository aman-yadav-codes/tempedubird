import { createHash } from "crypto";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { canAccessInstitution } from "@/lib/auth/institution-scope";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureInstitutionComplaintSchema } from "@/lib/queries/institution-complaints";
import { NotificationService } from "@/services/notificationService";

const TARGETS: Record<string, string[]> = {
  student: ["institution_admin", "teacher", "driver"],
  teacher: ["institution_admin", "driver", "student", "parent"],
  parent: ["institution_admin", "driver", "teacher"],
  driver: ["institution_admin", "teacher", "parent"],
  institution_admin: ["teacher", "driver", "student", "parent"],
};

const PERMISSION_MODULES: Record<string, string> = {
  student: "student.myinstitution.complaints",
  teacher: "teacher.myinstitution.complaints",
  parent: "parent.myinstitution.complaints",
  driver: "driver.myinstitution.complaints",
  institution_admin: "institution.complaints",
};

type CurrentUser = Awaited<ReturnType<typeof getAuthenticatedUser>>;

const MAX_ATTACHMENTS = 5;
const ACCEPTED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const COMPLAINT_STATUSES = new Set(["open", "in_progress", "resolved", "closed"]);
type UploadedAttachment = { file_name: string; file_url: string; public_id: string; resource_type: string };

function createSignature(params: Record<string, string | number>, secret: string) {
  const serialized = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&");
  return createHash("sha1").update(`${serialized}${secret}`).digest("hex");
}

async function uploadAttachment(file: File): Promise<UploadedAttachment> {
  if (!ACCEPTED_ATTACHMENT_TYPES.has(file.type)) throw new Error("Only images and PDF attachments are allowed");
  const maxSize = file.type === "application/pdf" ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxSize) throw new Error(file.type === "application/pdf" ? "PDF must be 10MB or smaller" : "Image must be 5MB or smaller");
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary is not configured");
  const timestamp = Math.round(Date.now() / 1000);
  const folder = "institution_complaint_attachments";
  const form = new FormData();
  form.append("file", file); form.append("api_key", apiKey); form.append("timestamp", String(timestamp));
  form.append("folder", folder); form.append("signature", createSignature({ folder, timestamp }, apiSecret));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: form });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message ?? `Failed to upload ${file.name}`);
  return { file_name: file.name.slice(0, 255), file_url: json.secure_url, public_id: json.public_id, resource_type: json.resource_type };
}

function responseError(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status = message === "Unauthorized" || message === "User not found" ? 401
    : message.startsWith("Forbidden") ? 403
      : message.includes("not found") ? 404
        : 400;
  return NextResponse.json({ error: message }, { status });
}

function actorRole(user: CurrentUser) {
  return ["institution_admin", "teacher", "student", "parent", "driver"]
    .find((role) => user.role_codes.includes(role)) ?? null;
}

function permissionFor(user: CurrentUser, action: "view" | "create" | "edit" | "delete", institutionId: number) {
  const role = actorRole(user);
  const permissionModule = role ? PERMISSION_MODULES[role] : null;
  return Boolean(permissionModule && hasPermission(user, `${permissionModule}.${action}`, { institutionId }));
}

function institutionFromRequest(req: Request, user: CurrentUser) {
  const requested = Number(new URL(req.url).searchParams.get("institutionId"));
  if (Number.isInteger(requested) && requested > 0) {
    if (!canAccessInstitution(user, requested)) throw new Error("Forbidden: Institution access denied");
    return requested;
  }

  const institutionId = user.memberships
    ?.find((membership) => membership.institution_id)
    ?.institution_id;
  if (!institutionId) throw new Error("Forbidden: Select an institution");
  return Number(institutionId);
}

function academicYearFromRequest(req: Request) {
  const requested = Number(new URL(req.url).searchParams.get("academicYearId"));
  return Number.isInteger(requested) && requested > 0 ? requested : null;
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

async function parentChildUserIds(institutionId: number, parentUserId: number) {
  const result = await db.query<{ user_id: number }>(
    `
      SELECT DISTINCT sp.user_id
      FROM student_guardians guardian
      INNER JOIN student_profiles sp ON sp.id = guardian.student_id
      INNER JOIN student_enrollments se
        ON se.student_id = sp.id
       AND se.institution_id = $2
       AND se.status = 'active'
       AND COALESCE(se.is_deleted, FALSE) = FALSE
      INNER JOIN users u ON u.id = sp.user_id
      WHERE guardian.guardian_user_id = $1
        AND COALESCE(guardian.is_deleted, FALSE) = FALSE
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
    `,
    [parentUserId, institutionId],
  );
  return result.rows.map((row) => row.user_id);
}

async function assertThreadAccess(
  complaintId: number,
  institutionId: number,
  user: CurrentUser,
  childUserIds: number[] = [],
  academicYearId: number | null = null,
) {
  const result = await db.query(
    `
      SELECT c.*
      FROM institution_complaints c
      WHERE c.id = $1
        AND c.institution_id = $2
        AND (
          c.created_by = $3
          OR c.target_user_id = $3
          OR c.target_user_id = ANY($5::int[])
          OR (c.target_user_id IS NULL AND c.target_role = ANY($4::text[]))
        )
        AND ($6::int IS NULL OR c.academic_year_id = $6)
      LIMIT 1
    `,
    [complaintId, institutionId, user.id, user.role_codes, childUserIds, academicYearId]
  );
  if (!result.rows[0]) throw new Error("Complaint not found");
  return result.rows[0];
}

async function assertComplaintRecipientAccess(
  complaintId: number,
  institutionId: number,
  user: CurrentUser,
  academicYearId: number | null = null,
) {
  const result = await db.query(
    `
      SELECT c.*
      FROM institution_complaints c
      WHERE c.id = $1
        AND c.institution_id = $2
        AND (
          c.target_user_id = $3
          OR (c.target_user_id IS NULL AND c.target_role = ANY($4::text[]))
        )
        AND ($5::int IS NULL OR c.academic_year_id = $5)
      LIMIT 1
    `,
    [complaintId, institutionId, user.id, user.role_codes, academicYearId]
  );
  if (!result.rows[0]) throw new Error("Forbidden: Only the complaint recipient can update status");
  return result.rows[0];
}

async function targetRoleUserIds(institutionId: number, roleCode: string) {
  const result = await db.query<{ id: number }>(
    `SELECT DISTINCT u.id
       FROM institution_memberships im
       INNER JOIN roles r ON r.id = im.role_id AND r.code = $2
       INNER JOIN users u ON u.id = im.user_id
      WHERE im.institution_id = $1
        AND im.is_active = TRUE
        AND COALESCE(im.is_deleted, FALSE) = FALSE
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE`,
    [institutionId, roleCode]
  );
  return result.rows.map((row) => row.id);
}

async function ensureComplaintNotificationTypes() {
  await db.query(`
    INSERT INTO notification_templates (code, title_template, body_template, is_active, updated_at)
    VALUES
      ('complaint.new_complaint', 'New institution complaint', '{{actor_name}} opened {{complaint_number}}: {{subject}}', TRUE, NOW()),
      ('complaint.new_message', 'New complaint message', '{{actor_name}} replied to {{complaint_number}}: {{message_preview}}', TRUE, NOW())
    ON CONFLICT (code) DO NOTHING
  `);
}

async function notifyComplaint(
  user: CurrentUser,
  complaint: { id: number; complaint_number: string; institution_id: number; created_by: number; target_role: string; target_user_id?: number | null; subject: string; priority?: string | null },
  type: "complaint.new_complaint" | "complaint.new_message",
  message = ""
) {
  const recipients = type === "complaint.new_complaint" || complaint.created_by === user.id
    ? complaint.target_user_id
      ? [complaint.target_user_id]
      : await targetRoleUserIds(complaint.institution_id, complaint.target_role)
    : [complaint.created_by];
  const recipientIds = recipients.filter((id) => id !== user.id);
  if (!recipientIds.length) return;

  await ensureComplaintNotificationTypes();
  await new NotificationService(db).create({
    type,
    recipients: recipientIds,
    institutionId: complaint.institution_id,
    entityType: "institution_complaint",
    entityId: complaint.id,
    createdBy: user.id,
    priority: complaint.priority === "high" || complaint.priority === "critical" ? "high" : "normal",
    payload: {
      actor_name: user.full_name,
      complaint_number: complaint.complaint_number,
      subject: complaint.subject,
      message_preview: message.slice(0, 120),
      url: `/admin/institution/complaints?complaint=${complaint.id}`,
    },
  });
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureInstitutionComplaintSchema();
    const institutionId = institutionFromRequest(req, user);
    const academicYearId = await resolveInstitutionAcademicYearId(academicYearFromRequest(req), institutionId);
    if (!permissionFor(user, "view", institutionId)) throw new Error("Forbidden: Complaint access required");
    const childUserIds = user.role_codes.includes("parent")
      ? await parentChildUserIds(institutionId, user.id)
      : [];

    const url = new URL(req.url);
    const recipientRole = url.searchParams.get("recipientRole")?.trim() ?? "";
    if (recipientRole) {
      const role = actorRole(user);
      if (!role || !TARGETS[role]?.includes(recipientRole)) {
        throw new Error("Forbidden: Recipient role is not allowed");
      }
      const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
      const search = url.searchParams.get("search")?.trim() ?? "";
      const recipients = await db.query(
        `SELECT DISTINCT u.id, u.full_name, u.email
           FROM institution_memberships im
           INNER JOIN roles r ON r.id = im.role_id AND r.code = $2
           INNER JOIN users u ON u.id = im.user_id
          WHERE im.institution_id = $1
            AND im.is_active = TRUE
            AND COALESCE(im.is_deleted, FALSE) = FALSE
            AND u.is_active = TRUE
            AND COALESCE(u.is_deleted, FALSE) = FALSE
            AND u.id <> $3
            AND ($4 = '' OR u.full_name ILIKE $5 OR u.email ILIKE $5)
          ORDER BY u.full_name, u.id
          LIMIT $6 OFFSET $7`,
        [institutionId, recipientRole, user.id, search, `%${search}%`, limit + 1, (page - 1) * limit]
      );
      return NextResponse.json({
        data: recipients.rows.slice(0, limit),
        hasMore: recipients.rows.length > limit,
      });
    }

    const complaintId = Number(url.searchParams.get("complaintId"));
    if (Number.isInteger(complaintId) && complaintId > 0) {
      const complaint = await assertThreadAccess(complaintId, institutionId, user, childUserIds, academicYearId);
      complaint.can_update_status = Boolean(
        complaint.target_user_id === user.id ||
          (!complaint.target_user_id && user.role_codes.includes(complaint.target_role))
      );
      const messages = await db.query(
        `
          SELECT m.id, m.message, m.created_at, m.edited_at, m.user_id, m.reply_to_message_id,
                 (m.user_id = $3) AS is_own,
                 u.full_name AS sender_name,
                 COALESCE(im_role.code, global_role.code, 'member') AS sender_role,
                 CASE
                   WHEN reply_message.id IS NULL THEN NULL
                   ELSE json_build_object(
                     'id', reply_message.id,
                     'user_id', reply_message.user_id,
                     'sender_name', reply_user.full_name,
                     'message', reply_message.message,
                     'has_attachments', EXISTS (
                       SELECT 1
                       FROM institution_complaint_attachments reply_attachment
                       WHERE reply_attachment.message_id = reply_message.id
                     )
                   )
                 END AS replied_message,
                 COALESCE((
                   SELECT json_agg(json_build_object(
                     'id', attachment.id,
                     'file_name', attachment.file_name,
                     'file_url', attachment.file_url,
                     'resource_type', attachment.resource_type
                   ) ORDER BY attachment.id)
                   FROM institution_complaint_attachments attachment
                   WHERE attachment.message_id = m.id
                 ), '[]'::json) AS attachments
          FROM institution_complaint_messages m
          INNER JOIN users u ON u.id = m.user_id
          LEFT JOIN LATERAL (
            SELECT r.code
            FROM institution_memberships im
            INNER JOIN roles r ON r.id = im.role_id
            WHERE im.user_id = m.user_id AND im.institution_id = $2 AND im.is_active = TRUE
            ORDER BY im.id DESC LIMIT 1
          ) im_role ON TRUE
          LEFT JOIN LATERAL (
            SELECT r.code FROM user_roles ur INNER JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = m.user_id ORDER BY ur.role_id DESC LIMIT 1
          ) global_role ON TRUE
          LEFT JOIN institution_complaint_messages reply_message
            ON reply_message.id = m.reply_to_message_id
           AND reply_message.complaint_id = m.complaint_id
          LEFT JOIN users reply_user ON reply_user.id = reply_message.user_id
          WHERE m.complaint_id = $1
          ORDER BY m.id ASC
          LIMIT 250
        `,
        [complaintId, institutionId, user.id]
      );
      return NextResponse.json({ data: { complaint, messages: messages.rows } });
    }

    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const search = url.searchParams.get("search")?.trim() ?? "";
    const view = url.searchParams.get("view") === "created" ? "created" : "received";
    const params = [institutionId, user.id, user.role_codes, childUserIds, academicYearId, search, `%${search}%`, limit, (page - 1) * limit];
    const accessWhere =
      view === "created"
        ? "c.created_by = $2"
        : `(c.target_user_id = $2 OR c.target_user_id = ANY($4::int[]) OR (c.target_user_id IS NULL AND c.target_role = ANY($3::text[])))`;
    const result = await db.query(
      `
        SELECT c.id, c.complaint_number, c.subject, c.priority, c.creator_role, c.target_role,
               c.status, c.created_at, c.updated_at, c.created_by, c.target_user_id,
               creator.full_name AS creator_name,
               target_user.full_name AS target_user_name,
               (c.target_user_id = ANY($4::int[])) AS is_student_complaint,
               (
                 c.target_user_id = $2
                 OR (c.target_user_id IS NULL AND c.target_role = ANY($3::text[]))
               ) AS can_update_status,
               COUNT(*) OVER()::int AS total_count,
               (SELECT message FROM institution_complaint_messages latest
                WHERE latest.complaint_id = c.id ORDER BY latest.id DESC LIMIT 1) AS last_message
        FROM institution_complaints c
        INNER JOIN users creator ON creator.id = c.created_by
        LEFT JOIN users target_user ON target_user.id = c.target_user_id
        WHERE c.institution_id = $1
          AND ${accessWhere}
          AND ($5::int IS NULL OR c.academic_year_id = $5)
          AND ($6 = '' OR c.subject ILIKE $7 OR c.complaint_number ILIKE $7 OR creator.full_name ILIKE $7)
        ORDER BY c.updated_at DESC, c.id DESC
        LIMIT $8 OFFSET $9
      `,
      params
    );
    const total = Number(result.rows[0]?.total_count ?? 0);
    return NextResponse.json({ data: result.rows, total, pageCount: Math.ceil(total / limit), page });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureInstitutionComplaintSchema();
    const institutionId = institutionFromRequest(req, user);
    const academicYearId = await resolveInstitutionAcademicYearId(academicYearFromRequest(req), institutionId);
    const contentType = req.headers.get("content-type") ?? "";
    let body: Record<string, unknown> = {};
    let files: File[] = [];
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      body = { complaint_id: form.get("complaint_id"), message: form.get("message"), reply_to_message_id: form.get("reply_to_message_id") };
      files = form.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    } else {
      body = await req.json();
    }
    const complaintId = Number(body.complaint_id);

    if (Number.isInteger(complaintId) && complaintId > 0) {
      if (!permissionFor(user, "edit", institutionId)) throw new Error("Forbidden: Reply access required");
      const childUserIds = user.role_codes.includes("parent")
        ? await parentChildUserIds(institutionId, user.id)
        : [];
      const complaint = await assertThreadAccess(complaintId, institutionId, user, childUserIds, academicYearId);
      const message = String(body.message ?? "").trim();
      const requestedReplyId = Number(body.reply_to_message_id);
      let replyToMessageId = Number.isInteger(requestedReplyId) && requestedReplyId > 0 ? requestedReplyId : null;
      if (!message && files.length === 0) throw new Error("Write a message or add an attachment");
      if (message.length > 5000) throw new Error("Enter a message up to 5000 characters");
      if (files.length > MAX_ATTACHMENTS) throw new Error(`A maximum of ${MAX_ATTACHMENTS} attachments is allowed`);
      const uploaded = await Promise.all(files.map(uploadAttachment));
      if (replyToMessageId) {
        const replyResult = await db.query(
          `SELECT id FROM institution_complaint_messages WHERE id = $1 AND complaint_id = $2 LIMIT 1`,
          [replyToMessageId, complaintId]
        );
        if (!replyResult.rows[0]) throw new Error("Reply message not found");
        replyToMessageId = Number(replyResult.rows[0].id);
      }
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query(
          `INSERT INTO institution_complaint_messages (complaint_id, user_id, message, reply_to_message_id)
           VALUES ($1, $2, $3, $4) RETURNING id, message, created_at, user_id, reply_to_message_id`,
          [complaintId, user.id, message, replyToMessageId]
        );
        if (uploaded.length) {
          await client.query(
            `INSERT INTO institution_complaint_attachments (message_id, file_name, file_url, public_id, resource_type, uploaded_by)
             SELECT $1, item->>'file_name', item->>'file_url', item->>'public_id', item->>'resource_type', $2
             FROM jsonb_array_elements($3::jsonb) item`,
            [result.rows[0].id, user.id, JSON.stringify(uploaded)]
          );
        }
        await client.query(`UPDATE institution_complaints SET updated_at = NOW() WHERE id = $1`, [complaintId]);
        await client.query("COMMIT");
        await notifyComplaint(user, complaint, "complaint.new_message", message || "Attachment");
        return NextResponse.json({ data: result.rows[0] }, { status: 201 });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    if (!permissionFor(user, "create", institutionId)) throw new Error("Forbidden: Create complaint access required");
    const role = actorRole(user);
    const targetRole = String(body.target_role ?? "").trim();
    const targetUserId = Number(body.target_user_id);
    const subject = String(body.subject ?? "").trim();
    const message = String(body.message ?? "").trim();
    const priorityInput = String(body.priority ?? "normal").trim().toLowerCase();
    const priority = priorityInput === "urgent" || priorityInput === "high" ? "high" : "normal";
    if (!role || !TARGETS[role]?.includes(targetRole)) throw new Error("Select an allowed complaint recipient");
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) throw new Error("Select the person receiving this complaint");
    if (targetUserId === user.id) throw new Error("Select another person to receive this complaint");
    const targetUser = await db.query(
      `SELECT 1
         FROM institution_memberships im
         INNER JOIN roles r ON r.id = im.role_id AND r.code = $3
         INNER JOIN users u ON u.id = im.user_id
        WHERE im.institution_id = $1 AND im.user_id = $2
          AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
          AND u.is_active = TRUE AND COALESCE(u.is_deleted, FALSE) = FALSE
        LIMIT 1`,
      [institutionId, targetUserId, targetRole]
    );
    if (!targetUser.rows[0]) throw new Error("Selected recipient is not available in this institution");
    if (!subject || subject.length > 180) throw new Error("Enter a subject up to 180 characters");
    if (!message || message.length > 5000) throw new Error("Enter a message up to 5000 characters");

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const complaintNumber = `CMP-${Date.now().toString(36).toUpperCase()}-${user.id}`;
      const complaint = await client.query(
        `INSERT INTO institution_complaints
           (complaint_number, institution_id, academic_year_id, created_by, creator_role, target_role, target_user_id, subject, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [complaintNumber, institutionId, academicYearId, user.id, role, targetRole, targetUserId, subject, priority]
      );
      await client.query(
        `INSERT INTO institution_complaint_messages (complaint_id, user_id, message) VALUES ($1, $2, $3)`,
        [complaint.rows[0].id, user.id, message]
      );
      await client.query("COMMIT");
      await notifyComplaint(user, complaint.rows[0], "complaint.new_complaint", message);
      return NextResponse.json({ data: complaint.rows[0] }, { status: 201 });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return responseError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureInstitutionComplaintSchema();
    const institutionId = institutionFromRequest(req, user);
    const academicYearId = await resolveInstitutionAcademicYearId(academicYearFromRequest(req), institutionId);
    if (!permissionFor(user, "edit", institutionId)) throw new Error("Forbidden: Complaint edit access required");

    const body = await req.json();
    const complaintId = Number(body.id);
    const status = String(body.status ?? "").trim();
    if (!Number.isInteger(complaintId) || complaintId <= 0 || !COMPLAINT_STATUSES.has(status)) {
      throw new Error("Valid complaint id and status are required");
    }

    await assertComplaintRecipientAccess(complaintId, institutionId, user, academicYearId);
    const result = await db.query(
      `
        UPDATE institution_complaints
        SET status = $2,
            closed_at = CASE WHEN $2 = 'closed' THEN NOW() ELSE NULL END,
            updated_at = NOW()
        WHERE id = $1
          AND institution_id = $3
          AND ($4::int IS NULL OR academic_year_id = $4)
        RETURNING *
      `,
      [complaintId, status, institutionId, academicYearId]
    );
    if (!result.rows[0]) throw new Error("Complaint not found");
    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return responseError(error);
  }
}
