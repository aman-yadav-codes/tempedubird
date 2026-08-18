import type { Pool } from "pg";

import {
  isCriticalNotificationType,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  setNotificationImportant,
} from "@/lib/queries/notifications";
import { publishRealtimeNotification } from "@/lib/notifications/socket-publisher";

type NotificationPayload = Record<string, unknown>;
type ListNotificationOptions = {
  offset?: number;
  unreadOnly?: boolean;
  importantOnly?: boolean;
};

const DELIVERABLE_NOTIFICATION_TYPES = new Set([
  "support.new_ticket",
  "support.new_message",
  "support.status_changed",
  "complaint.new_complaint",
  "complaint.new_message",
  "noticeboard.new_notice",
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
]);

type CreateNotificationInput = {
  type: string;
  recipients: number[];
  institutionId?: number | null;
  entityType?: string | null;
  entityId?: number | null;
  payload?: NotificationPayload;
  createdBy?: number | null;
  priority?: "low" | "normal" | "high" | "critical";
  title?: string;
  message?: string;
};

function renderTemplate(template: string, payload: NotificationPayload) {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = key.split(".").reduce<unknown>((current, part) => {
      if (!current || typeof current !== "object") return undefined;
      return (current as Record<string, unknown>)[part];
    }, payload);

    return value === undefined || value === null ? "" : String(value);
  });
}

function uniquePositiveIds(ids: number[]) {
  return Array.from(
    new Set(
      ids
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );
}

function logSkippedNotification(
  type: string,
  reason: string,
  details: Record<string, unknown> = {}
) {
  console.info("[notification.skipped]", { type, reason, ...details });
}

function withInstitutionPayload(input: CreateNotificationInput) {
  const payload = { ...(input.payload ?? {}) };
  if (input.institutionId && payload.institution_id === undefined) {
    payload.institution_id = input.institutionId;
  }
  return payload;
}

export class NotificationService {
  constructor(private readonly db: Pool) {}

  async create(input: CreateNotificationInput) {
    if (!DELIVERABLE_NOTIFICATION_TYPES.has(input.type)) {
      logSkippedNotification(input.type, "unsupported_notification_type");
      return { notification: null, recipientCount: 0, skipped: true };
    }
    const recipients = uniquePositiveIds(input.recipients);
    if (!recipients.length) {
      logSkippedNotification(input.type, "no_recipients", {
        requestedRecipientIds: input.recipients,
        institutionId: input.institutionId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      });
      return { notification: null, recipientCount: 0, skipped: true };
    }

    const templateResult = await this.db.query<{
      code: string;
      title_template: string;
      body_template: string;
      is_active: boolean;
    }>(
      `SELECT code, title_template, body_template, is_active
       FROM notification_templates
       WHERE code = $1
       LIMIT 1`,
      [input.type]
    );
    const template = templateResult.rows[0];

    if (!template?.is_active) {
      logSkippedNotification(input.type, template ? "platform_type_inactive" : "platform_type_missing", {
        requestedRecipientIds: recipients,
        institutionId: input.institutionId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      });
      return { notification: null, recipientCount: 0, skipped: true };
    }

    if (input.institutionId) {
      const settingResult = await this.db.query<{ is_enabled: boolean }>(
        `SELECT is_enabled
         FROM institution_notification_settings
         WHERE institution_id = $1 AND notification_type = $2
         LIMIT 1`,
        [input.institutionId, input.type]
      );

      if (settingResult.rows[0]?.is_enabled === false) {
        logSkippedNotification(input.type, "institution_type_disabled", {
          requestedRecipientIds: recipients,
          institutionId: input.institutionId,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
        });
        return { notification: null, recipientCount: 0, skipped: true };
      }
    }

    let deliverableRecipients = recipients;
    if (!isCriticalNotificationType(input.type)) {
      const preferenceResult = await this.db.query<{ user_id: number }>(
        `SELECT user_id
         FROM notification_preferences
         WHERE notification_type = $1
           AND is_enabled = false
           AND user_id = ANY($2::int[])`,
        [input.type, recipients]
      );
      const mutedUserIds = new Set(preferenceResult.rows.map((row) => row.user_id));
      deliverableRecipients = recipients.filter((userId) => !mutedUserIds.has(userId));
    }

    if (!deliverableRecipients.length) {
      logSkippedNotification(input.type, "all_recipients_muted", {
        requestedRecipientIds: recipients,
        institutionId: input.institutionId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      });
      return { notification: null, recipientCount: 0, skipped: true };
    }

    const payload = withInstitutionPayload(input);
    const title = input.title ?? renderTemplate(template.title_template, payload);
    const message = input.message ?? renderTemplate(template.body_template, payload);
    const priority = input.priority ?? (isCriticalNotificationType(input.type) ? "critical" : "normal");

    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const notificationResult = await client.query<{
        id: string;
        type: string;
        title: string;
        message: string;
        priority: string;
      }>(
        `INSERT INTO notifications (
           type,
           title,
           message,
           priority,
           entity_type,
           entity_id,
           payload,
           created_by,
           created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, timezone('Asia/Kolkata', NOW()))
         RETURNING id::text, type, title, message, priority`,
        [
          input.type,
          title,
          message,
          priority,
          input.entityType ?? null,
          input.entityId ?? null,
          JSON.stringify(payload),
          input.createdBy ?? null,
        ]
      );
      const notification = notificationResult.rows[0];

      await client.query(
        `INSERT INTO notification_recipients (notification_id, user_id, delivered_at)
         SELECT $1::bigint, unnest($2::int[]), timezone('Asia/Kolkata', NOW())
         ON CONFLICT (notification_id, user_id) DO NOTHING`,
        [notification.id, deliverableRecipients]
      );

      await client.query("COMMIT");

      void publishRealtimeNotification({
        recipientIds: deliverableRecipients,
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
        },
      });

      console.info("[notification.created]", {
        id: notification.id,
        type: notification.type,
        recipientIds: deliverableRecipients,
        recipientCount: deliverableRecipients.length,
        institutionId: input.institutionId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      });

      return {
        notification,
        recipientCount: deliverableRecipients.length,
        skipped: false,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  listForUser(userId: number, limit?: number, options?: ListNotificationOptions) {
    return listUserNotifications(this.db, userId, limit, options);
  }

  markRead(userId: number, notificationId: number) {
    return markNotificationRead(this.db, userId, notificationId);
  }

  markAllRead(userId: number) {
    return markAllNotificationsRead(this.db, userId);
  }

  setImportant(userId: number, notificationId: number, isImportant: boolean) {
    return setNotificationImportant(this.db, userId, notificationId, isImportant);
  }
}
