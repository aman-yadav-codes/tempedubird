import type { Pool } from "pg";

export const CRITICAL_NOTIFICATION_TYPES = [] as const;

const DEFAULT_NOTIFICATION_TYPES = [
  "support.new_ticket",
  "support.new_message",
  "support.status_changed",
  "complaint.new_complaint",
  "complaint.new_message",
  "noticeboard.new_notice",
  "staff.leave_request.created",
  "content.assignments.created",
  "content.practice_exams.created",
  "content.exams.created",
  "content.assignments.blocked",
  "content.practice_exams.blocked",
  "content.exams.blocked",
  "content.blog.published",
  "fees.payment_request.created",
  "fees.payment_request.approved",
  "fees.payment_request.rejected",
  "finance.recurring_expense.reminder",
];

const DEFAULT_NOTIFICATION_TYPES_SQL = DEFAULT_NOTIFICATION_TYPES.map((type) => `'${type}'`).join(", ");

export type UserNotification = {
  recipient_id: string;
  notification_id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  is_read: boolean;
  is_important: boolean;
  read_at: string | null;
  created_at: string;
};

export type NotificationPreference = {
  notification_type: string;
  is_enabled: boolean;
  is_critical: boolean;
};

export type NotificationTemplate = {
  id: number;
  code: string;
  title_template: string;
  body_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InstitutionNotificationSetting = {
  institution_id: number;
  institution_name: string;
  notification_type: string | null;
  title_template: string | null;
  is_enabled: boolean;
};

export type InstitutionNotificationSummary = {
  institution_id: number;
  institution_name: string;
  enabled_count: number;
  disabled_count: number;
  total_count: number;
};

export async function ensureSystemNotificationTemplates(db: Pool) {
  await db.query(
    `
      INSERT INTO notification_templates (
        code,
        title_template,
        body_template,
        is_active,
        updated_at
      )
      VALUES
        ('support.new_ticket', 'New support request', '{{actor_name}} opened {{ticket_number}}: {{subject}}', TRUE, NOW()),
        ('support.new_message', 'New support message', '{{actor_name}} replied to {{ticket_number}}: {{message_preview}}', TRUE, NOW()),
        ('support.status_changed', 'Support status changed', '{{ticket_number}} is now {{status_label}}.', TRUE, NOW()),
        ('complaint.new_complaint', 'New institution complaint', '{{actor_name}} opened {{complaint_number}}: {{subject}}', TRUE, NOW()),
        ('complaint.new_message', 'New complaint message', '{{actor_name}} replied to {{complaint_number}}: {{message_preview}}', TRUE, NOW()),
        ('noticeboard.new_notice', 'New noticeboard message', '{{actor_name}} published: {{title}}', TRUE, NOW()),
        ('staff.leave_request.created', 'New staff leave request', '{{staff_name}} ({{staff_role}}) requested leave from {{from_date}} to {{to_date}}: {{message_preview}}', TRUE, NOW()),
        ('content.assignments.created', 'New assignment assigned', '{{actor_name}} assigned {{assignment_name}}. Due: {{due_date}}', TRUE, NOW()),
        ('content.practice_exams.created', 'New practice exam assigned', '{{actor_name}} assigned {{practice_exam_name}}.', TRUE, NOW()),
        ('content.exams.created', 'New exam scheduled', '{{actor_name}} scheduled {{exam_name}} from {{from_date}} to {{to_date}}.', TRUE, NOW()),
        ('content.assignments.blocked', 'Assignment blocked', '{{assignment_name}} was blocked: {{block_reason}}', TRUE, NOW()),
        ('content.practice_exams.blocked', 'Practice exam blocked', '{{practice_exam_name}} was blocked: {{block_reason}}', TRUE, NOW()),
        ('content.exams.blocked', 'Exam blocked', '{{exam_name}} was blocked: {{block_reason}}', TRUE, NOW()),
        ('content.blog.published', 'Blog published', '{{blog_title}} was published. Scheduled for: {{scheduled_at}}', TRUE, NOW()),
        ('fees.payment_request.created', 'New fee payment request', '{{student_name}} submitted {{amount}} for {{period_count}} fee month(s). Transaction ID: {{transaction_id}}', TRUE, NOW()),
        ('fees.payment_request.approved', 'Fee payment confirmed', '{{amount}} payment for {{student_name}} was verified and marked paid.', TRUE, NOW()),
        ('fees.payment_request.rejected', 'Fee payment rejected', '{{amount}} payment for {{student_name}} was rejected. Reason: {{rejection_reason}}', TRUE, NOW()),
        ('finance.recurring_expense.reminder', 'Recurring expense due soon', '{{expense_title}} of {{amount}} is due on {{end_date}}. {{days_remaining}} day(s) remaining.', TRUE, NOW())
      ON CONFLICT (code) DO NOTHING;

      DELETE FROM notification_preferences
      WHERE notification_type NOT IN (${DEFAULT_NOTIFICATION_TYPES_SQL});

      DELETE FROM institution_notification_settings
      WHERE notification_type NOT IN (${DEFAULT_NOTIFICATION_TYPES_SQL});

      DELETE FROM notification_templates
      WHERE code NOT IN (${DEFAULT_NOTIFICATION_TYPES_SQL});
    `
  );
}

export function isCriticalNotificationType(type: string) {
  void type;
  return false;
}

async function ensureNotificationImportantColumn(db: Pool) {
  await db.query(
    `ALTER TABLE notification_recipients
     ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT FALSE NOT NULL`
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_notification_recipients_important
     ON notification_recipients(user_id, is_important)`
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_notification_recipients_unread
     ON notification_recipients(user_id, is_read, notification_id)`
  );
  await db.query(
    `CREATE INDEX IF NOT EXISTS idx_notifications_type_created
     ON notifications(type, created_at DESC, id)`
  );
}

export async function listUserNotifications(
  db: Pool,
  userId: number,
  limit = 10,
  options: {
    offset?: number;
    unreadOnly?: boolean;
    importantOnly?: boolean;
  } = {}
) {
  await ensureNotificationImportantColumn(db);
  const cappedLimit = Math.min(Math.max(limit, 1), 50);
  const offset = Math.max(Number(options.offset ?? 0), 0);
  const unreadFilter = options.unreadOnly ? "AND nr.is_read = false" : "";
  const importantFilter = options.importantOnly ? "AND nr.is_important = true" : "";
  const result = await db.query<{
    items: UserNotification[] | null;
    total_count: number;
    unread_count: number;
    important_count: number;
    user_exists: boolean;
  }>(
    `WITH active_user AS (
       SELECT id
       FROM users
       WHERE id = $1
         AND is_active = TRUE
         AND COALESCE(is_deleted, FALSE) = FALSE
       LIMIT 1
     ),
     unread_count AS (
       SELECT COUNT(*)::int AS unread_count
       FROM active_user au
       JOIN notification_recipients nr ON nr.user_id = au.id
       JOIN notifications n ON n.id = nr.notification_id
       WHERE nr.is_read = false
         AND n.type = ANY($3::text[])
     ),
     important_count AS (
       SELECT COUNT(*)::int AS important_count
       FROM active_user au
       JOIN notification_recipients nr ON nr.user_id = au.id
       JOIN notifications n ON n.id = nr.notification_id
       WHERE nr.is_important = true
         AND n.type = ANY($3::text[])
     ),
     filtered_count AS (
       SELECT COUNT(*)::int AS total_count
       FROM active_user au
       JOIN notification_recipients nr ON nr.user_id = au.id
       JOIN notifications n ON n.id = nr.notification_id
       WHERE n.type = ANY($3::text[])
         ${unreadFilter}
         ${importantFilter}
     )
     SELECT
       EXISTS(SELECT 1 FROM active_user) AS user_exists,
       COALESCE(
         json_agg(item ORDER BY item.created_at DESC)
           FILTER (WHERE item.recipient_id IS NOT NULL),
         '[]'::json
       ) AS items,
       filtered_count.total_count,
       unread_count.unread_count,
       important_count.important_count
     FROM unread_count
     CROSS JOIN important_count
     CROSS JOIN filtered_count
     LEFT JOIN LATERAL (
       SELECT
          nr.id::text AS recipient_id,
          n.id::text AS notification_id,
          n.type,
          n.title,
          n.message,
          n.priority,
          n.entity_type,
          n.entity_id::text,
          n.payload,
          nr.is_read,
          nr.is_important,
          nr.read_at,
          n.created_at
       FROM active_user au
       JOIN notification_recipients nr ON nr.user_id = au.id
       JOIN notifications n ON n.id = nr.notification_id
       WHERE n.type = ANY($3::text[])
         ${unreadFilter}
         ${importantFilter}
       ORDER BY n.created_at DESC
       LIMIT $2
       OFFSET $4
     ) item ON TRUE
     GROUP BY filtered_count.total_count, unread_count.unread_count, important_count.important_count`,
    [userId, cappedLimit, DEFAULT_NOTIFICATION_TYPES, offset]
  );
  const row = result.rows[0];

  return {
    items: row?.items ?? [],
    total: row?.total_count ?? 0,
    unreadCount: row?.unread_count ?? 0,
    importantCount: row?.important_count ?? 0,
    userExists: row?.user_exists ?? false,
  };
}

export async function markAllNotificationsRead(db: Pool, userId: number) {
  await db.query(
    `UPDATE notification_recipients
     SET is_read = true, read_at = COALESCE(read_at, timezone('Asia/Kolkata', NOW()))
     WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
}

export async function markNotificationRead(
  db: Pool,
  userId: number,
  notificationId: number
) {
  await db.query(
    `UPDATE notification_recipients
     SET is_read = true, read_at = COALESCE(read_at, timezone('Asia/Kolkata', NOW()))
     WHERE user_id = $1 AND notification_id = $2`,
    [userId, notificationId]
  );
}

export async function setNotificationImportant(
  db: Pool,
  userId: number,
  notificationId: number,
  isImportant: boolean
) {
  await ensureNotificationImportantColumn(db);

  await db.query(
    `UPDATE notification_recipients
     SET is_important = $3
     WHERE user_id = $1 AND notification_id = $2`,
    [userId, notificationId, isImportant]
  );
}

export async function listNotificationPreferences(db: Pool, userId: number) {
  await ensureSystemNotificationTemplates(db);
  const result = await db.query<NotificationPreference>(
    `WITH available_types AS (
        SELECT unnest($2::text[]) AS notification_type
        UNION
        SELECT code AS notification_type FROM notification_templates
      )
      SELECT
        available_types.notification_type,
        COALESCE(np.is_enabled, true) AS is_enabled,
        available_types.notification_type = ANY($3::text[]) AS is_critical
      FROM available_types
      LEFT JOIN notification_preferences np
        ON np.user_id = $1
        AND np.notification_type = available_types.notification_type
      ORDER BY available_types.notification_type`,
    [userId, DEFAULT_NOTIFICATION_TYPES, CRITICAL_NOTIFICATION_TYPES]
  );

  return result.rows;
}

export async function updateNotificationPreference(
  db: Pool,
  userId: number,
  notificationType: string,
  isEnabled: boolean
) {
  if (isCriticalNotificationType(notificationType)) {
    return {
      notification_type: notificationType,
      is_enabled: true,
      is_critical: true,
    } satisfies NotificationPreference;
  }

  const result = await db.query<NotificationPreference>(
    `INSERT INTO notification_preferences (user_id, notification_type, is_enabled, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, notification_type)
     DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_at = NOW()
     RETURNING notification_type, is_enabled, false AS is_critical`,
    [userId, notificationType, isEnabled]
  );

  return result.rows[0];
}

export async function listNotificationTemplates(db: Pool) {
  await ensureSystemNotificationTemplates(db);
  const result = await db.query<NotificationTemplate>(
    `SELECT id, code, title_template, body_template, is_active, created_at, updated_at
     FROM notification_templates
     ORDER BY code`
  );

  return result.rows;
}

export async function updateNotificationTemplate(
  db: Pool,
  id: number,
  input: Partial<{
    code: string;
    title_template: string;
    body_template: string;
    is_active: boolean;
  }>
) {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.code !== undefined) {
    params.push(input.code);
    fields.push(`code = $${params.length}`);
  }
  if (input.title_template !== undefined) {
    params.push(input.title_template);
    fields.push(`title_template = $${params.length}`);
  }
  if (input.body_template !== undefined) {
    params.push(input.body_template);
    fields.push(`body_template = $${params.length}`);
  }
  if (input.is_active !== undefined) {
    params.push(input.is_active);
    fields.push(`is_active = $${params.length}`);
  }

  if (!fields.length) {
    throw new Error("No template fields to update");
  }

  params.push(id);
  const result = await db.query<NotificationTemplate>(
    `UPDATE notification_templates
     SET ${fields.join(", ")}, updated_at = NOW()
     WHERE id = $${params.length}
     RETURNING id, code, title_template, body_template, is_active, created_at, updated_at`,
    params
  );

  return result.rows[0] ?? null;
}

export async function deleteNotificationTemplates(db: Pool, ids: number[]) {
  if (!ids.length) return 0;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const codesResult = await client.query<{ code: string }>(
      `SELECT code FROM notification_templates WHERE id = ANY($1::int[])`,
      [ids]
    );
    const codes = codesResult.rows.map((row) => row.code);

    if (codes.length) {
      await client.query(
        `DELETE FROM institution_notification_settings
         WHERE notification_type = ANY($1::text[])`,
        [codes]
      );
    }

    const result = await client.query<{ id: number }>(
      `DELETE FROM notification_templates
       WHERE id = ANY($1::int[])
       RETURNING id`,
      [ids]
    );
    await client.query("COMMIT");
    return result.rows.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listInstitutionNotificationSettings(
  db: Pool,
  institutionIds: number[] | null
) {
  const params: unknown[] = [];
  const institutionFilter = institutionIds
    ? `AND ip.id = ANY($${params.push(institutionIds)}::int[])`
    : "";

  const result = await db.query<InstitutionNotificationSetting>(
      `WITH available_types AS (
        SELECT code, title_template
        FROM notification_templates
      ),
      scoped_institutions AS (
        SELECT ip.id, ip.name
        FROM institution_profiles ip
        WHERE ip.is_active = true
          AND COALESCE(ip.is_deleted, false) = false
          ${institutionFilter}
      )
      SELECT
        scoped_institutions.id AS institution_id,
        scoped_institutions.name AS institution_name,
        available_types.code AS notification_type,
        available_types.title_template,
        COALESCE(ins.is_enabled, true) AS is_enabled
      FROM scoped_institutions
      LEFT JOIN available_types ON TRUE
      LEFT JOIN institution_notification_settings ins
        ON ins.institution_id = scoped_institutions.id
        AND ins.notification_type = available_types.code
      ORDER BY scoped_institutions.name, available_types.code`,
    params
  );

  return result.rows;
}

export async function updateInstitutionNotificationSetting(
  db: Pool,
  institutionId: number,
  notificationType: string,
  isEnabled: boolean
) {
  const result = await db.query<InstitutionNotificationSetting>(
    `WITH upserted AS (
       INSERT INTO institution_notification_settings (
         institution_id,
         notification_type,
         is_enabled,
         updated_at
       )
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (institution_id, notification_type)
       DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_at = NOW()
       RETURNING institution_id, notification_type, is_enabled
     )
     SELECT
       upserted.institution_id,
       ip.name AS institution_name,
       upserted.notification_type,
       nt.title_template,
       upserted.is_enabled
     FROM upserted
     INNER JOIN institution_profiles ip ON ip.id = upserted.institution_id
     INNER JOIN notification_templates nt ON nt.code = upserted.notification_type`,
    [institutionId, notificationType, isEnabled]
  );

  return result.rows[0] ?? null;
}

export async function replaceInstitutionNotificationSettings(
  db: Pool,
  institutionId: number,
  enabledTypes: string[]
) {
  const activeTypesResult = await db.query<{ code: string }>(
    `SELECT code FROM notification_templates`
  );
  const activeTypes = activeTypesResult.rows.map((row) => row.code);
  const enabledSet = new Set(enabledTypes.filter((type) => activeTypes.includes(type)));

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM institution_notification_settings
       WHERE institution_id = $1`,
      [institutionId]
    );

    if (activeTypes.length) {
      await client.query(
        `INSERT INTO institution_notification_settings (
           institution_id,
           notification_type,
           is_enabled,
           updated_at
         )
         SELECT $1, unnest($2::text[]), unnest($3::boolean[]), NOW()
         ON CONFLICT (institution_id, notification_type)
         DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_at = NOW()`,
        [
          institutionId,
          activeTypes,
          activeTypes.map((type) => enabledSet.has(type)),
        ]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function setAllInstitutionNotificationSettings(
  db: Pool,
  institutionIds: number[],
  isEnabled: boolean
) {
  if (!institutionIds.length) return;

  await db.query(
    `INSERT INTO institution_notification_settings (
       institution_id,
       notification_type,
       is_enabled,
       updated_at
     )
     SELECT institution_id, code, $2, NOW()
     FROM unnest($1::int[]) AS scoped(institution_id)
     CROSS JOIN (
       SELECT code
       FROM notification_templates
     ) active_templates
     ON CONFLICT (institution_id, notification_type)
     DO UPDATE SET is_enabled = EXCLUDED.is_enabled, updated_at = NOW()`,
    [institutionIds, isEnabled]
  );
}

export async function clearInstitutionNotificationSettings(
  db: Pool,
  institutionIds: number[]
) {
  if (!institutionIds.length) return;

  await db.query(
    `INSERT INTO institution_notification_settings (
       institution_id,
       notification_type,
       is_enabled,
       updated_at
     )
     SELECT institution_id, code, FALSE, NOW()
     FROM unnest($1::int[]) AS scoped(institution_id)
     CROSS JOIN (
       SELECT code
       FROM notification_templates
     ) active_templates
     ON CONFLICT (institution_id, notification_type)
     DO UPDATE SET is_enabled = FALSE, updated_at = NOW()`,
    [institutionIds]
  );
}
