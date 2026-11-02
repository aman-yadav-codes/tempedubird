import { db } from "@/lib/db/db";

export type LogActivityParams = {
  institutionId?: number | null;
  userId?: number | string | null;
  userName: string;
  userRole?: string | null;
  userType?: "staff" | "client" | "admin" | "other";
  module: "operations" | "finance" | "clients" | "staff" | "categories" | "settings";
  actionType: string;
  title: string;
  description?: string | null;
  entityType?: string;
  entityId?: string | number | null;
  clientId?: number | null;
  clientName?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  createdAt?: string | Date;
};

export async function logSystemActivity(params: LogActivityParams): Promise<void> {
  try {
    const instId = params.institutionId ? Number(params.institutionId) : null;
    const uId = params.userId ? Number(params.userId) : null;
    const meta = JSON.stringify(params.metadata || {});

    await db.query(
      `INSERT INTO system_activity_logs (
        institution_id, user_id, user_name, user_role, user_type,
        module, action_type, title, description, entity_type,
        entity_id, client_id, client_name, metadata, ip_address,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, COALESCE($16, NOW()))`,
      [
        instId,
        uId,
        params.userName || "System",
        params.userRole || "Staff",
        params.userType || "staff",
        params.module,
        params.actionType,
        params.title,
        params.description || null,
        params.entityType || null,
        params.entityId ? String(params.entityId) : null,
        params.clientId ? Number(params.clientId) : null,
        params.clientName || null,
        meta,
        params.ipAddress || null,
        params.createdAt ? new Date(params.createdAt) : null,
      ]
    );
  } catch (err) {
    console.error("[logSystemActivity] Failed to insert activity log:", err);
  }
}

