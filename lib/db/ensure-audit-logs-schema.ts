import { db } from "@/lib/db/db";

let schemaEnsured = false;

export async function ensureAuditLogsSchema() {
  if (schemaEnsured) return;

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_audit_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id INT,
        user_name VARCHAR(255),
        user_role VARCHAR(100),
        institution_id INT,
        institution_name VARCHAR(255),
        action_type VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'STATUS_CHANGE', 'LOGIN', 'EXPORT'
        resource_type VARCHAR(100) NOT NULL, -- 'Course', 'Student', 'Staff', 'Finance', 'Exam', 'Note', etc.
        resource_id VARCHAR(100),
        resource_name VARCHAR(255),
        description TEXT NOT NULL,
        previous_data JSONB DEFAULT '{}'::jsonb,
        new_data JSONB DEFAULT '{}'::jsonb,
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created ON system_audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_system_audit_logs_action ON system_audit_logs(action_type);
      CREATE INDEX IF NOT EXISTS idx_system_audit_logs_inst ON system_audit_logs(institution_id);
      CREATE INDEX IF NOT EXISTS idx_system_audit_logs_resource ON system_audit_logs(resource_type);
    `);

    // Seed realistic audit records if table is empty
    const countRes = await db.query<{ count: string }>(`SELECT COUNT(*) as count FROM system_audit_logs`);
    if (Number(countRes.rows[0]?.count || 0) === 0) {
      await db.query(`
        INSERT INTO system_audit_logs (
          user_id, user_name, user_role, institution_id, institution_name, action_type, resource_type, resource_id, resource_name, description, previous_data, new_data, ip_address, created_at
        )
        VALUES
          (
            1, 'Platform Admin', 'platform_admin', NULL, 'EduBird Platform',
            'UPDATE', 'Course', '102', 'NEET Intensive Classroom 2026',
            'Updated course fee from ₹45,000 to ₹42,500 and extended batch capacity to 60 seats',
            '{"price": "₹45,000", "seats": 45, "status": "active"}'::jsonb,
            '{"price": "₹42,500", "seats": 60, "status": "active"}'::jsonb,
            '103.21.124.55', NOW() - INTERVAL '35 minutes'
          ),
          (
            2, 'Deepak Yadav', 'institution_admin', 1, 'Maa Sharda Institute PVT LTD',
            'CREATE', 'Academic Session', '15', 'Academic Year 2026-2027',
            'Created new academic session template for 2026-2027 starting April 1, 2026',
            '{}'::jsonb,
            '{"name": "2026-2027", "start_date": "2026-04-01", "end_date": "2027-03-31", "is_active": true}'::jsonb,
            '14.139.241.12', NOW() - INTERVAL '1 hour 15 minutes'
          ),
          (
            2, 'Deepak Yadav', 'institution_admin', 1, 'Maa Sharda Institute PVT LTD',
            'STATUS_CHANGE', 'Student Enrollment', '204', 'Rohan Gupta (B.Tech CSE)',
            'Approved student enrollment application and generated student ID card',
            '{"status": "pending_approval", "id_card_generated": false}'::jsonb,
            '{"status": "enrolled", "id_card_generated": true}'::jsonb,
            '14.139.241.12', NOW() - INTERVAL '2 hours 10 minutes'
          ),
          (
            1, 'Platform Admin', 'platform_admin', NULL, 'EduBird Platform',
            'DELETE', 'Vendor', '18', 'QuickFix Computer Service',
            'Moved inactive vendor record to Recycle Bin',
            '{"name": "QuickFix Computer Service", "status": "inactive", "city": "Delhi"}'::jsonb,
            '{"is_deleted": true, "deleted_at": "NOW()"}'::jsonb,
            '103.21.124.55', NOW() - INTERVAL '3 hours'
          ),
          (
            2, 'Deepak Yadav', 'institution_admin', 1, 'Maa Sharda Institute PVT LTD',
            'UPDATE', 'Finance Entry', '55', 'Monthly Staff Allowance',
            'Modified payment reference number and verified UPI transaction',
            '{"payment_method": "cash", "status": "due", "amount": 12000}'::jsonb,
            '{"payment_method": "upi", "status": "paid", "amount": 12000, "reference": "UPI/2026/8981"}'::jsonb,
            '14.139.241.12', NOW() - INTERVAL '4 hours 30 minutes'
          ),
          (
            1, 'Platform Admin', 'platform_admin', NULL, 'EduBird Platform',
            'RESTORE', 'Exam Notice', '8', 'JEE Advanced 2026 Exam Pattern Handout',
            'Restored deleted exam document from Recycle Bin',
            '{"is_deleted": true}'::jsonb,
            '{"is_deleted": false, "status": "active"}'::jsonb,
            '103.21.124.55', NOW() - INTERVAL '6 hours'
          ),
          (
            2, 'Deepak Yadav', 'institution_admin', 1, 'Maa Sharda Institute PVT LTD',
            'UPDATE', 'Timetable Setup', '4', 'Class 12th Physics Batch A',
            'Updated class room from Room 102 to Lecture Hall 3 and shifted faculty timing',
            '{"room": "Room 102", "timing": "10:00 AM - 11:30 AM"}'::jsonb,
            '{"room": "Lecture Hall 3", "timing": "11:00 AM - 12:30 PM"}'::jsonb,
            '14.139.241.12', NOW() - INTERVAL '1 day'
          ),
          (
            1, 'Platform Admin', 'platform_admin', NULL, 'EduBird Platform',
            'CREATE', 'Payment Method', '7', 'Bank NEFT Account',
            'Configured platform banking details and QR code for subscription collections',
            '{}'::jsonb,
            '{"bank_name": "HDFC Bank", "account_no": "50200088991122", "ifsc": "HDFC0001202"}'::jsonb,
            '103.21.124.55', NOW() - INTERVAL '1 day 4 hours'
          );
      `);
    }

    schemaEnsured = true;
  } catch (err) {
    console.error("Error ensuring audit logs schema:", err);
  }
}

export async function recordAuditLog(data: {
  userId?: number | null;
  userName?: string | null;
  userRole?: string | null;
  institutionId?: number | null;
  institutionName?: string | null;
  actionType: "CREATE" | "UPDATE" | "DELETE" | "RESTORE" | "STATUS_CHANGE" | "LOGIN" | "EXPORT";
  resourceType: string;
  resourceId?: string | number | null;
  resourceName?: string | null;
  description: string;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    await ensureAuditLogsSchema();
    await db.query(`
      INSERT INTO system_audit_logs (
        user_id, user_name, user_role, institution_id, institution_name,
        action_type, resource_type, resource_id, resource_name,
        description, previous_data, new_data, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      data.userId || null,
      data.userName || null,
      data.userRole || null,
      data.institutionId || null,
      data.institutionName || null,
      data.actionType,
      data.resourceType,
      data.resourceId ? String(data.resourceId) : null,
      data.resourceName || null,
      data.description,
      JSON.stringify(data.previousData || {}),
      JSON.stringify(data.newData || {}),
      data.ipAddress || null,
      data.userAgent || null,
    ]);
  } catch (err) {
    console.error("Failed to record audit log:", err);
  }
}
