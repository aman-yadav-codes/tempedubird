import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { resolveTenantContext } from "@/lib/records/tenant-context";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const recordId = Number(params.id);
    if (!recordId) {
      return NextResponse.json({ error: "Invalid record ID" }, { status: 400 });
    }

    const tenant = await resolveTenantContext(req);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 401 });
    }

    const body = await req.json();
    const { status, is_active, is_featured } = body;

    let updateSql = `
      UPDATE business_records
      SET
        status = COALESCE($1, status),
        is_active = COALESCE($2, is_active),
        is_featured = COALESCE($3, is_featured),
        updated_by = $4,
        updated_at = NOW()
      WHERE id = $5 AND is_deleted = FALSE
    `;
    const updateParams: any[] = [
      status || null,
      is_active !== undefined ? Boolean(is_active) : null,
      is_featured !== undefined ? Boolean(is_featured) : null,
      tenant.userId,
      recordId,
    ];

    if (!tenant.isPlatformAdmin) {
      updateParams.push(tenant.userId, tenant.businessId);
      updateSql += ` AND (
        created_by = $6 
        OR (
          business_id = $7 
          AND business_id IN (SELECT id FROM business_profiles WHERE user_id = $6)
        )
      )`;
    }

    updateSql += ` RETURNING id, title, status, is_active, is_featured`;
    const res = await db.query(updateSql, updateParams);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Record not found or access denied" }, { status: 404 });
    }

    const updated = res.rows[0];

    // Audit log
    await db.query(`
      INSERT INTO business_record_audit_logs (record_id, business_id, user_id, action, changes)
      VALUES ($1, $2, $3, 'status_change', $4)
    `, [recordId, tenant.businessId, tenant.userId, JSON.stringify({ status: updated.status, is_active: updated.is_active })]);

    return NextResponse.json({
      success: true,
      message: `Status updated to ${updated.status}`,
      data: updated,
    });
  } catch (err: any) {
    console.error("[Record PATCH Status] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update status" }, { status: 500 });
  }
}
