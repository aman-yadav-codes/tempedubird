import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureFeatureSchema();
    const { id } = await context.params;

    const res = await db.query(
      `SELECT r.* FROM finance_purchase_sell_requests r WHERE r.id = $1`,
      [id]
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ request: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch request" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureFeatureSchema();
    const { id } = await context.params;
    const body = await req.json();
    const { status, review_notes } = body;

    if (!["approved", "rejected", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    }

    const existingRes = await db.query(
      `SELECT * FROM finance_purchase_sell_requests WHERE id = $1`,
      [id]
    );
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    const existing = existingRes.rows[0];

    const isPlatformAdmin = isPlatformAdminUser(user);
    const isInstAdmin = isInstitutionAdminUser(user);
    const userId = Number(user.id);

    // Permission checks:
    // Cancellation: can be done by creator or admins if status is still 'pending'
    if (status === "cancelled") {
      const isCreator = Number(existing.created_by) === userId;
      if (!isCreator && !isPlatformAdmin && !isInstAdmin) {
        return NextResponse.json({ error: "Only the request creator or an administrator can cancel this request" }, { status: 403 });
      }
      if (existing.status !== "pending") {
        return NextResponse.json({ error: "Only pending requests can be cancelled" }, { status: 400 });
      }
    }

    // Approval / Rejection:
    // Can be done by:
    // 1) Designated assigned approver (`assigned_approver_id === user.id`)
    // 2) Institution Admin (for requests in their institution)
    // 3) Platform Admin (for platform requests or platform-wide oversight)
    if (status === "approved" || status === "rejected") {
      const isAssignedApprover = existing.assigned_approver_id && Number(existing.assigned_approver_id) === userId;
      const isScopeInstAdmin = isInstAdmin && existing.scope_type === "institution" && (
        !existing.institution_id ||
        (user.memberships ?? []).some((m) => Number(m.institution_id) === Number(existing.institution_id))
      );

      if (!isAssignedApprover && !isPlatformAdmin && !isScopeInstAdmin) {
        return NextResponse.json(
          { error: "You are not authorized to approve or reject this request. Only the assigned approver or an administrator can review it." },
          { status: 403 }
        );
      }

      if (status === "rejected" && (!review_notes || !review_notes.trim())) {
        return NextResponse.json({ error: "Please provide a reason for rejecting this request." }, { status: 400 });
      }
    }

    const reviewerName = user.full_name || user.email || "Admin";

    const updateRes = await db.query(
      `UPDATE finance_purchase_sell_requests
       SET status = $1,
           reviewed_by = $2,
           reviewed_by_name = $3,
           reviewed_at = NOW(),
           review_notes = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [status, userId, reviewerName, review_notes?.trim() || null, id]
    );

    return NextResponse.json({ request: updateRes.rows[0] });
  } catch (error: any) {
    console.error("[finance_requests_PATCH]", error);
    return NextResponse.json({ error: error?.message || "Failed to update request" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureFeatureSchema();
    const { id } = await context.params;

    const existingRes = await db.query(
      `SELECT * FROM finance_purchase_sell_requests WHERE id = $1`,
      [id]
    );
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    const existing = existingRes.rows[0];

    const isPlatformAdmin = isPlatformAdminUser(user);
    const isInstAdmin = isInstitutionAdminUser(user);
    const isCreator = Number(existing.created_by) === Number(user.id);

    if (!isCreator && !isPlatformAdmin && !isInstAdmin) {
      return NextResponse.json({ error: "You are not authorized to delete this request" }, { status: 403 });
    }

    // Only allow deleting pending or cancelled requests
    if (existing.status === "approved") {
      return NextResponse.json({ error: "Approved requests cannot be deleted" }, { status: 400 });
    }

    await db.query(`DELETE FROM finance_purchase_sell_requests WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("[finance_requests_DELETE]", error);
    return NextResponse.json({ error: error?.message || "Failed to delete request" }, { status: 500 });
  }
}
