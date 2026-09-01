import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureAuditLogsSchema } from "@/lib/db/ensure-audit-logs-schema";
import { getRequestedInstitutionId } from "@/lib/auth/institution-scope";

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureAuditLogsSchema();

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;

    const search = url.searchParams.get("search")?.trim() || "";
    const actionType = url.searchParams.get("actionType")?.trim() || "";
    const resourceType = url.searchParams.get("resourceType")?.trim() || "";
    const dateFrom = url.searchParams.get("dateFrom")?.trim() || "";
    const dateTo = url.searchParams.get("dateTo")?.trim() || "";
    const requestedInstId = getRequestedInstitutionId(url.searchParams);

    const isPlatformAdmin = isPlatformAdminUser(currentUser);

    const params: unknown[] = [];
    const whereClauses: string[] = ["1=1"];

    // Institution scoping
    if (!isPlatformAdmin) {
      const userInstIds = (currentUser.memberships ?? [])
        .map((m) => m.institution_id)
        .filter((id): id is number => Number.isInteger(id) && id > 0);
      const targetInstId = requestedInstId || userInstIds[0] || null;
      if (targetInstId) {
        params.push(targetInstId);
        whereClauses.push(`institution_id = $${params.length}`);
      }
    } else if (requestedInstId) {
      params.push(requestedInstId);
      whereClauses.push(`institution_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(
        description ILIKE $${params.length}
        OR COALESCE(resource_name, '') ILIKE $${params.length}
        OR COALESCE(user_name, '') ILIKE $${params.length}
        OR COALESCE(ip_address, '') ILIKE $${params.length}
        OR COALESCE(resource_id, '') ILIKE $${params.length}
        OR resource_type ILIKE $${params.length}
      )`);
    }

    if (actionType && actionType !== "ALL") {
      params.push(actionType);
      whereClauses.push(`action_type = $${params.length}`);
    }

    if (resourceType && resourceType !== "ALL") {
      params.push(resourceType);
      whereClauses.push(`resource_type = $${params.length}`);
    }

    if (dateFrom) {
      params.push(dateFrom);
      whereClauses.push(`created_at >= $${params.length}::date`);
    }

    if (dateTo) {
      params.push(dateTo);
      whereClauses.push(`created_at <= ($${params.length}::date + INTERVAL '1 day')`);
    }

    const whereSql = whereClauses.join(" AND ");

    // Fetch stats and paginated records
    const [statsRes, countRes, logsRes] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) AS total_logs,
          COUNT(*) FILTER (WHERE action_type = 'UPDATE') AS total_updates,
          COUNT(*) FILTER (WHERE action_type = 'DELETE') AS total_deletes,
          COUNT(*) FILTER (WHERE action_type = 'CREATE') AS total_creates,
          COUNT(*) FILTER (WHERE action_type = 'RESTORE') AS total_restores,
          COUNT(*) FILTER (WHERE action_type = 'STATUS_CHANGE') AS total_status_changes
        FROM system_audit_logs
        WHERE ${whereSql}
      `, params),
      db.query(`SELECT COUNT(*) AS count FROM system_audit_logs WHERE ${whereSql}`, params),
      db.query(`
        SELECT *
        FROM system_audit_logs
        WHERE ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]),
    ]);

    const total = Number(countRes.rows[0]?.count || 0);

    return NextResponse.json({
      summary: statsRes.rows[0] || {
        total_logs: 0,
        total_updates: 0,
        total_deletes: 0,
        total_creates: 0,
        total_restores: 0,
        total_status_changes: 0,
      },
      data: logsRes.rows,
      total,
      pageCount: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Audit logs API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load audit logs" },
      { status: 500 }
    );
  }
}
