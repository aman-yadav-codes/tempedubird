import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { NotificationService } from "@/services/notificationService";
import { ensureApprovalColumns } from "../route";

type ActionBody = {
  itemType: "assignment" | "note" | "practice_exam" | "exam" | "teacher";
  itemId: number;
  action: "allow" | "decline";
  reason?: string;
};

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    if (!isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Forbidden: Platform Admin access required" },
        { status: 403 }
      );
    }

    await ensureApprovalColumns();

    const body: ActionBody = await req.json();
    const { itemType, itemId, action } = body;
    const reason = String(body.reason || "").trim();

    if (!itemId || !Number.isInteger(Number(itemId)) || Number(itemId) <= 0) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    if (action !== "allow" && action !== "decline") {
      return NextResponse.json({ error: "Action must be 'allow' or 'decline'" }, { status: 400 });
    }

    const notificationService = new NotificationService(db);
    let authorId: number | null = null;
    let institutionId: number | null = null;
    let itemTitle = "";
    let itemUrl = "";
    let formattedTypeName = "";

    if (itemType === "assignment") {
      formattedTypeName = "Assignment";
      itemUrl = "/admin/classroom/assignments";

      if (action === "allow") {
        const updateRes = await db.query<{
          id: number;
          title: string;
          created_by: number;
          marketplace_requested_by: number;
          source_institution_id: number;
        }>(
          `
            UPDATE assignment_templates
            SET is_public = TRUE,
                marketplace_approved = TRUE,
                marketplace_approved_at = CURRENT_TIMESTAMP,
                marketplace_approved_by = $2,
                marketplace_rejected_at = NULL,
                marketplace_rejection_reason = NULL,
                updated_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND COALESCE(is_deleted, FALSE) = FALSE
            RETURNING id, title, created_by, marketplace_requested_by, source_institution_id
          `,
          [itemId, currentUser.id]
        );

        if (!updateRes.rows[0]) {
          return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
        }

        const row = updateRes.rows[0];
        authorId = row.marketplace_requested_by || row.created_by;
        institutionId = row.source_institution_id;
        itemTitle = row.title;
      } else {
        const updateRes = await db.query<{
          id: number;
          title: string;
          created_by: number;
          marketplace_requested_by: number;
          source_institution_id: number;
        }>(
          `
            UPDATE assignment_templates
            SET is_public = FALSE,
                marketplace_approved = FALSE,
                marketplace_approved_at = NULL,
                marketplace_approved_by = NULL,
                marketplace_requested = FALSE,
                marketplace_rejected_at = CURRENT_TIMESTAMP,
                marketplace_rejection_reason = $3,
                updated_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND COALESCE(is_deleted, FALSE) = FALSE
            RETURNING id, title, created_by, marketplace_requested_by, source_institution_id
          `,
          [itemId, currentUser.id, reason || "Declined by platform admin"]
        );

        if (!updateRes.rows[0]) {
          return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
        }

        const row = updateRes.rows[0];
        authorId = row.marketplace_requested_by || row.created_by;
        institutionId = row.source_institution_id;
        itemTitle = row.title;
      }
    } else if (itemType === "note") {
      formattedTypeName = "Notes";
      itemUrl = "/admin/master-data/notes";

      if (action === "allow") {
        const updateRes = await db.query<{
          id: number;
          title: string;
          created_by: number;
          marketplace_requested_by: number;
          institution_id: number;
        }>(
          `
            UPDATE notes
            SET is_public = TRUE,
                marketplace_approved = TRUE,
                marketplace_approved_at = CURRENT_TIMESTAMP,
                marketplace_approved_by = $2,
                marketplace_rejected_at = NULL,
                marketplace_rejection_reason = NULL,
                updated_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND COALESCE(is_deleted, FALSE) = FALSE
            RETURNING id, title, created_by, marketplace_requested_by, institution_id
          `,
          [itemId, currentUser.id]
        );

        if (!updateRes.rows[0]) {
          return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        const row = updateRes.rows[0];
        authorId = row.marketplace_requested_by || row.created_by;
        institutionId = row.institution_id;
        itemTitle = row.title;
      } else {
        const updateRes = await db.query<{
          id: number;
          title: string;
          created_by: number;
          marketplace_requested_by: number;
          institution_id: number;
        }>(
          `
            UPDATE notes
            SET is_public = FALSE,
                marketplace_approved = FALSE,
                marketplace_approved_at = NULL,
                marketplace_approved_by = NULL,
                marketplace_requested = FALSE,
                marketplace_rejected_at = CURRENT_TIMESTAMP,
                marketplace_rejection_reason = $3,
                updated_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND COALESCE(is_deleted, FALSE) = FALSE
            RETURNING id, title, created_by, marketplace_requested_by, institution_id
          `,
          [itemId, currentUser.id, reason || "Declined by platform admin"]
        );

        if (!updateRes.rows[0]) {
          return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        const row = updateRes.rows[0];
        authorId = row.marketplace_requested_by || row.created_by;
        institutionId = row.institution_id;
        itemTitle = row.title;
      }
    } else if (itemType === "practice_exam") {
      formattedTypeName = "Practice Exam";
      itemUrl = "/admin/master-data/practice-exams";

      if (action === "allow") {
        const updateRes = await db.query<{
          id: number;
          title: string;
          created_by: number;
          marketplace_requested_by: number;
          source_institution_id: number;
        }>(
          `
            UPDATE practice_exam_templates
            SET is_public = TRUE,
                marketplace_approved = TRUE,
                marketplace_approved_at = CURRENT_TIMESTAMP,
                marketplace_approved_by = $2,
                marketplace_rejected_at = NULL,
                marketplace_rejection_reason = NULL,
                updated_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND COALESCE(is_deleted, FALSE) = FALSE
            RETURNING id, title, created_by, marketplace_requested_by, source_institution_id
          `,
          [itemId, currentUser.id]
        );

        if (!updateRes.rows[0]) {
          return NextResponse.json({ error: "Practice Exam not found" }, { status: 404 });
        }

        const row = updateRes.rows[0];
        authorId = row.marketplace_requested_by || row.created_by;
        institutionId = row.source_institution_id;
        itemTitle = row.title;
      } else {
        const updateRes = await db.query<{
          id: number;
          title: string;
          created_by: number;
          marketplace_requested_by: number;
          source_institution_id: number;
        }>(
          `
            UPDATE practice_exam_templates
            SET is_public = FALSE,
                marketplace_approved = FALSE,
                marketplace_approved_at = NULL,
                marketplace_approved_by = NULL,
                marketplace_requested = FALSE,
                marketplace_rejected_at = CURRENT_TIMESTAMP,
                marketplace_rejection_reason = $3,
                updated_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND COALESCE(is_deleted, FALSE) = FALSE
            RETURNING id, title, created_by, marketplace_requested_by, source_institution_id
          `,
          [itemId, currentUser.id, reason || "Declined by platform admin"]
        );

        if (!updateRes.rows[0]) {
          return NextResponse.json({ error: "Practice Exam not found" }, { status: 404 });
        }

        const row = updateRes.rows[0];
        authorId = row.marketplace_requested_by || row.created_by;
        institutionId = row.source_institution_id;
        itemTitle = row.title;
      }
    } else if (itemType === "exam") {
      formattedTypeName = "Exam";
      itemUrl = "/admin/master-data/exams";

      if (action === "allow") {
        const updateRes = await db.query<{
          id: number;
          title: string;
          created_by: number;
          marketplace_requested_by: number;
          source_institution_id: number;
        }>(
          `
            UPDATE exam_templates
            SET is_public = TRUE,
                marketplace_approved = TRUE,
                marketplace_approved_at = CURRENT_TIMESTAMP,
                marketplace_approved_by = $2,
                marketplace_rejected_at = NULL,
                marketplace_rejection_reason = NULL,
                updated_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND COALESCE(is_deleted, FALSE) = FALSE
            RETURNING id, title, created_by, marketplace_requested_by, source_institution_id
          `,
          [itemId, currentUser.id]
        );

        if (!updateRes.rows[0]) {
          return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        const row = updateRes.rows[0];
        authorId = row.marketplace_requested_by || row.created_by;
        institutionId = row.source_institution_id;
        itemTitle = row.title;
      } else {
        const updateRes = await db.query<{
          id: number;
          title: string;
          created_by: number;
          marketplace_requested_by: number;
          source_institution_id: number;
        }>(
          `
            UPDATE exam_templates
            SET is_public = FALSE,
                marketplace_approved = FALSE,
                marketplace_approved_at = NULL,
                marketplace_approved_by = NULL,
                marketplace_requested = FALSE,
                marketplace_rejected_at = CURRENT_TIMESTAMP,
                marketplace_rejection_reason = $3,
                updated_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND COALESCE(is_deleted, FALSE) = FALSE
            RETURNING id, title, created_by, marketplace_requested_by, source_institution_id
          `,
          [itemId, currentUser.id, reason || "Declined by platform admin"]
        );

        if (!updateRes.rows[0]) {
          return NextResponse.json({ error: "Exam not found" }, { status: 404 });
        }

        const row = updateRes.rows[0];
        authorId = row.marketplace_requested_by || row.created_by;
        institutionId = row.source_institution_id;
        itemTitle = row.title;
      }
    } else if (itemType === "teacher") {
      formattedTypeName = "Teacher Profile";
      itemUrl = `/admin/users`;

      if (action === "allow") {
        await db.query(
          `
            UPDATE users
            SET is_verified = TRUE,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [itemId]
        );

        const updateRes = await db.query<{
          user_id: number;
          full_name: string;
          under_institution_id: number;
        }>(
          `
            INSERT INTO user_profiles (user_id, marketplace_requested, marketplace_approved, marketplace_approved_at, marketplace_approved_by, is_verified, updated_at)
            VALUES ($1, TRUE, TRUE, CURRENT_TIMESTAMP, $2, TRUE, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE SET
              marketplace_approved = TRUE,
              marketplace_approved_at = CURRENT_TIMESTAMP,
              marketplace_approved_by = $2,
              marketplace_rejected_at = NULL,
              marketplace_rejection_reason = NULL,
              is_verified = TRUE,
              updated_at = CURRENT_TIMESTAMP
            RETURNING user_id, (SELECT full_name FROM users WHERE id = $1) AS full_name, under_institution_id
          `,
          [itemId, currentUser.id]
        );

        const row = updateRes.rows[0];
        authorId = row?.user_id || itemId;
        institutionId = row?.under_institution_id || null;
        itemTitle = row?.full_name || "Faculty Profile";
      } else {
        await db.query(
          `
            UPDATE users
            SET is_verified = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
          [itemId]
        );

        const updateRes = await db.query<{
          user_id: number;
          full_name: string;
          under_institution_id: number;
        }>(
          `
            INSERT INTO user_profiles (user_id, marketplace_requested, marketplace_approved, marketplace_rejected_at, marketplace_rejection_reason, is_verified, updated_at)
            VALUES ($1, FALSE, FALSE, CURRENT_TIMESTAMP, $3, FALSE, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE SET
              marketplace_approved = FALSE,
              marketplace_approved_at = NULL,
              marketplace_approved_by = NULL,
              marketplace_requested = FALSE,
              marketplace_rejected_at = CURRENT_TIMESTAMP,
              marketplace_rejection_reason = $3,
              is_verified = FALSE,
              updated_at = CURRENT_TIMESTAMP
            RETURNING user_id, (SELECT full_name FROM users WHERE id = $1) AS full_name, under_institution_id
          `,
          [itemId, currentUser.id, reason || "Declined by platform admin"]
        );

        const row = updateRes.rows[0];
        authorId = row?.user_id || itemId;
        institutionId = row?.under_institution_id || null;
        itemTitle = row?.full_name || "Faculty Profile";
      }
    }

    // Dispatch real-time notification to the author
    if (authorId && authorId > 0) {
      try {
        const isAllowed = action === "allow";
        const title = isAllowed
          ? `${formattedTypeName} Approved for Marketplace`
          : `${formattedTypeName} Marketplace Request Declined`;
        const bodyText = isAllowed
          ? `Great news! Your ${formattedTypeName.toLowerCase()} "${itemTitle}" has been approved by the Platform Admin and is now live on the marketplace.`
          : `Your request to publish ${formattedTypeName.toLowerCase()} "${itemTitle}" to the marketplace was declined.${reason ? ` Reason: ${reason}` : ""}`;

        await notificationService.create({
          type: isAllowed ? "content.marketplace.approved" : "content.marketplace.declined",
          recipients: [authorId],
          institutionId: institutionId || undefined,
          entityType: itemType,
          entityId: itemId,
          createdBy: currentUser.id,
          priority: "high",
          payload: {
            actor_name: currentUser.full_name || "Platform Admin",
            title,
            item_title: itemTitle,
            item_type: itemType,
            status: isAllowed ? "allowed" : "declined",
            reason: isAllowed ? undefined : reason,
            message: bodyText,
            url: itemUrl,
          },
        });
      } catch (notifErr) {
        console.error("[approvals.notification.error]", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      action,
      itemType,
      itemId,
      notifiedAuthorId: authorId,
    });
  } catch (error) {
    console.error("[approvals.action.error]", error);
    const message = error instanceof Error ? error.message : "Failed to execute action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
