import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureMasterDataSchema } from "@/lib/db/ensure-master-schema";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureMasterDataSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Platform Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const recordId = Number(id);
    if (isNaN(recordId)) {
      return NextResponse.json({ error: "Invalid record ID" }, { status: 400 });
    }

    const body = await req.json();
    const newStatus = body.status === "active" ? "active" : "inactive";

    const res = await db.query(`
      UPDATE master_records
      SET status = $1, updated_by = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, status, vertical_id, master_type_id;
    `, [newStatus, user.id, recordId]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    const record = res.rows[0];

    // Audit Log
    await db.query(`
      INSERT INTO master_audit_logs (vertical_id, master_type_id, record_id, record_name, action, changed_fields, performed_by, performed_by_name)
      VALUES ($1, $2, $3, $4, 'status_change', $5, $6, $7);
    `, [
      record.vertical_id,
      record.master_type_id,
      recordId,
      record.name,
      JSON.stringify({ status: newStatus }),
      user.id,
      user.full_name || user.email || `User #${user.id}`,
    ]);

    return NextResponse.json({
      success: true,
      data: record,
      message: `Status updated to ${newStatus}`,
    });
  } catch (err: any) {
    console.error("[Master Record Status PATCH] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update record status" }, { status: 500 });
  }
}
