import { db } from "@/lib/db/db";
import { ensureFinanceIncomeSchema } from "@/lib/queries/finance";
import { ensureSystemNotificationTemplates } from "@/lib/queries/notifications";
import { NotificationService } from "@/services/notificationService";

export type ScheduledJobStatus = "active" | "completed" | "failed" | "cancelled";

export type ScheduledJobRow = {
  id: number;
  job_key: string;
  title: string;
  task_type: string;
  resource_type: string;
  resource_id: number | null;
  scope_type: "platform" | "institution";
  institution_id: number | null;
  institution_name: string | null;
  run_at: string;
  status: ScheduledJobStatus;
  payload: Record<string, unknown> | null;
  last_error: string | null;
  created_by: number | null;
  created_by_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ScheduleJobInput = {
  jobKey: string;
  title: string;
  taskType: string;
  resourceType: string;
  resourceId?: number | null;
  scopeType?: "platform" | "institution";
  institutionId?: number | null;
  runAt: string | Date;
  payload?: Record<string, unknown>;
  createdBy?: number | null;
};

type RecurringExpenseReminderRow = {
  id: string;
  scope_type: "platform" | "institution";
  institution_id: number | null;
  institution_name: string | null;
  title: string;
  amount: string | number;
  end_date: string;
  reminder_days_before: number;
  today: string;
};

type RecurringExpenseScheduleRow = {
  id: string;
  scope_type: "platform" | "institution";
  institution_id: number | null;
  title: string;
  end_date: string | null;
  payment_status: "paid" | "due";
  reminder_days_before: number;
  is_active: boolean;
};

export async function ensureScheduledJobsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id SERIAL PRIMARY KEY,
      job_key TEXT NOT NULL,
      title TEXT NOT NULL,
      task_type TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER NULL,
      scope_type TEXT NOT NULL DEFAULT 'platform' CHECK (scope_type IN ('platform', 'institution')),
      institution_id INTEGER NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      run_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      last_error TEXT NULL,
      created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      completed_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS scheduled_jobs_active_job_key_unique
      ON scheduled_jobs(job_key)
      WHERE status = 'active'
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS scheduled_jobs_due_idx
      ON scheduled_jobs(status, run_at)
  `);
}

export async function scheduleJob(input: ScheduleJobInput) {
  await ensureScheduledJobsTable();

  const result = await db.query<ScheduledJobRow>(
    `
      INSERT INTO scheduled_jobs (
        job_key,
        title,
        task_type,
        resource_type,
        resource_id,
        scope_type,
        institution_id,
        run_at,
        status,
        payload,
        created_by,
        updated_by,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9::jsonb, $10, $10, CURRENT_TIMESTAMP)
      ON CONFLICT (job_key)
        WHERE status = 'active'
      DO UPDATE SET
        title = EXCLUDED.title,
        task_type = EXCLUDED.task_type,
        resource_type = EXCLUDED.resource_type,
        resource_id = EXCLUDED.resource_id,
        scope_type = EXCLUDED.scope_type,
        institution_id = EXCLUDED.institution_id,
        run_at = EXCLUDED.run_at,
        payload = EXCLUDED.payload,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
    [
      input.jobKey,
      input.title,
      input.taskType,
      input.resourceType,
      input.resourceId ?? null,
      input.scopeType ?? (input.institutionId ? "institution" : "platform"),
      input.institutionId ?? null,
      input.runAt,
      JSON.stringify(input.payload ?? {}),
      input.createdBy ?? null,
    ],
  );

  return result.rows[0];
}

export async function cancelActiveJob(jobKey: string) {
  await ensureScheduledJobsTable();
  await db.query(
    `
      UPDATE scheduled_jobs
      SET status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE job_key = $1
        AND status = 'active'
    `,
    [jobKey],
  );
}

export async function cancelScheduledJobsByIds(ids: number[]) {
  await ensureScheduledJobsTable();
  const cleanIds = ids.filter((id) => Number.isInteger(id) && id > 0);
  if (cleanIds.length === 0) return 0;

  const result = await db.query(
    `
      UPDATE scheduled_jobs
      SET status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($1::int[])
        AND status = 'active'
    `,
    [cleanIds],
  );

  return result.rowCount ?? 0;
}

export async function listScheduledJobs() {
  await ensureScheduledJobsTable();
  const result = await db.query<ScheduledJobRow>(
    `
      SELECT
        scheduled_jobs.*,
        ip.name AS institution_name,
        creator.full_name AS created_by_name
      FROM scheduled_jobs
      LEFT JOIN institution_profiles ip ON ip.id = scheduled_jobs.institution_id
      LEFT JOIN users creator ON creator.id = scheduled_jobs.created_by
      ORDER BY
        CASE scheduled_jobs.status WHEN 'active' THEN 0 WHEN 'failed' THEN 1 ELSE 2 END,
        scheduled_jobs.run_at ASC,
        scheduled_jobs.id DESC
    `,
  );

  return result.rows;
}

async function runBlogPublishJob(job: ScheduledJobRow) {
  const blogPostId = Number(job.payload?.blogPostId ?? job.resource_id);
  if (!Number.isInteger(blogPostId) || blogPostId <= 0) {
    throw new Error("Blog post id is missing for scheduled publish job.");
  }

  const publishedResult = await db.query<{
    id: number;
    title: string;
    institution_id: number | null;
    author_id: number | null;
    created_by: number | null;
    publish_at: string | null;
    published_at: string;
  }>(
    `
      UPDATE blog_posts
      SET status = 'published',
          published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, title, institution_id, author_id, created_by, publish_at, published_at
    `,
    [blogPostId],
  );

  const post = publishedResult.rows[0];
  if (!post) {
    throw new Error("Blog post was not found for scheduled publish job.");
  }

  const recipientId = post.author_id ?? post.created_by ?? job.created_by;
  if (!recipientId) return;

  await ensureSystemNotificationTemplates(db);
  await new NotificationService(db).create({
    type: "content.blog.published",
    recipients: [recipientId],
    institutionId: post.institution_id,
    entityType: "blog_post",
    entityId: post.id,
    createdBy: job.created_by,
    payload: {
      blog_id: post.id,
      blog_title: post.title,
      scheduled_at: job.run_at,
      published_at: post.published_at,
      url: `/admin/content/blog?blogId=${post.id}`,
    },
  });
}

function formatCurrency(value: string | number) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function parseDateParts(value: string): [number, number, number] {
  const [year, month, day] = value.split("-").map(Number);
  return [year, month - 1, day];
}

function daysBetween(fromDate: string, toDate: string) {
  const from = Date.UTC(...parseDateParts(fromDate));
  const to = Date.UTC(...parseDateParts(toDate));
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

function addDays(value: string, days: number) {
  const date = new Date(Date.UTC(...parseDateParts(value)));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function recurringReminderJobKey(id: number, endDate: string, notifyOn: string) {
  return `finance:recurring-expense:${id}:reminder:${endDate}:${notifyOn}`;
}

function reminderStartDate(endDate: string, daysBefore: number) {
  return addDays(endDate, -Math.max(0, daysBefore));
}

function reminderRunAt(date: string) {
  return `${date}T00:00:00+05:30`;
}

async function cancelActiveRecurringExpenseReminderJobs(id: number) {
  await ensureScheduledJobsTable();
  await db.query(
    `
      UPDATE scheduled_jobs
      SET status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active'
        AND task_type = 'finance_recurring_expense_reminder'
        AND resource_type = 'finance_recurring_expense'
        AND resource_id = $1
    `,
    [id],
  );
}

export async function syncRecurringExpenseReminderJob(id: number, createdBy?: number | null) {
  if (!Number.isInteger(id) || id <= 0) return null;
  await ensureFinanceIncomeSchema(db);
  const result = await db.query<RecurringExpenseScheduleRow>(
    `
      SELECT
        id::text,
        scope_type::text AS scope_type,
        institution_id,
        title,
        end_date::text AS end_date,
        payment_status::text AS payment_status,
        reminder_days_before,
        is_active
      FROM finance_recurring_expenses
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );
  const row = result.rows[0];
  await cancelActiveRecurringExpenseReminderJobs(id);
  if (!row?.is_active || row.payment_status !== "due" || !row.end_date) return null;

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const startDate = reminderStartDate(row.end_date, row.reminder_days_before);
  const notifyOn = today > startDate ? today : startDate;

  return scheduleJob({
    jobKey: recurringReminderJobKey(id, row.end_date, notifyOn),
    title: `Recurring expense reminder: ${row.title}`,
    taskType: "finance_recurring_expense_reminder",
    resourceType: "finance_recurring_expense",
    resourceId: id,
    scopeType: row.scope_type,
    institutionId: row.institution_id,
    runAt: reminderRunAt(notifyOn),
    payload: {
      recurringExpenseId: id,
      endDate: row.end_date,
      notifyOn,
      reminderDaysBefore: row.reminder_days_before,
    },
    createdBy: createdBy ?? null,
  });
}

async function recurringReminderRecipients(row: RecurringExpenseReminderRow) {
  if (row.scope_type === "platform") {
    const result = await db.query<{ id: number }>(
      `
        SELECT DISTINCT u.id
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        JOIN roles r ON r.id = ur.role_id
        WHERE r.code = 'platform_admin'
          AND COALESCE(u.is_deleted, FALSE) = FALSE
      `,
    );
    return result.rows.map((item) => item.id);
  }

  if (!row.institution_id) return [];
  const result = await db.query<{ id: number }>(
    `
      SELECT DISTINCT u.id
      FROM institution_memberships im
      JOIN users u ON u.id = im.user_id
      JOIN roles r ON r.id = im.role_id
      WHERE im.institution_id = $1
        AND r.code = 'institution_admin'
        AND im.is_active = TRUE
        AND COALESCE(im.is_deleted, FALSE) = FALSE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
    `,
    [row.institution_id],
  );
  return result.rows.map((item) => item.id);
}

async function loadDueRecurringExpenseReminderRows(whereSql: string, params: unknown[], limit: number) {
  return db.query<RecurringExpenseReminderRow>(
    `
      WITH current_day AS (
        SELECT timezone('Asia/Kolkata', NOW())::date AS today
      )
      SELECT
        fre.id::text,
        fre.scope_type::text AS scope_type,
        fre.institution_id,
        ip.name AS institution_name,
        fre.title,
        fre.amount,
        fre.end_date::text AS end_date,
        fre.reminder_days_before,
        current_day.today::text AS today
      FROM finance_recurring_expenses fre
      CROSS JOIN current_day
      LEFT JOIN institution_profiles ip ON ip.id = fre.institution_id
      WHERE fre.is_active = TRUE
        AND fre.payment_status = 'due'
        AND fre.end_date IS NOT NULL
        AND current_day.today >= (fre.end_date - (fre.reminder_days_before || ' days')::interval)::date
        ${whereSql}
        AND NOT EXISTS (
          SELECT 1
          FROM finance_recurring_expense_reminders rer
          WHERE rer.recurring_expense_id = fre.id
            AND rer.reminder_for_date = fre.end_date
            AND rer.notified_on = current_day.today
        )
      ORDER BY fre.end_date ASC, fre.id ASC
      LIMIT $${params.length + 1}
    `,
    [...params, limit],
  );
}

async function processRecurringExpenseReminder(row: RecurringExpenseReminderRow, createdBy?: number | null) {
  const notificationService = new NotificationService(db);
  const id = Number(row.id);
  const recipients = await recurringReminderRecipients(row);
  if (!recipients.length) {
    return { id, status: "skipped" as const, recipientCount: 0 };
  }

  const notificationResult = await notificationService.create({
    type: "finance.recurring_expense.reminder",
    recipients,
    institutionId: row.institution_id,
    entityType: "finance_recurring_expense",
    entityId: id,
    priority: "high",
    createdBy,
    payload: {
      expense_title: row.title,
      amount: formatCurrency(row.amount),
      end_date: formatDate(row.end_date),
      days_remaining: daysBetween(row.today, row.end_date),
      institution_name: row.institution_name,
      url: row.scope_type === "platform" ? "/admin/finance/recurring-expenses" : "/institute/finance/recurring-expenses",
    },
  });

  await db.query(
    `
      INSERT INTO finance_recurring_expense_reminders (
        recurring_expense_id,
        reminder_for_date,
        notified_on,
        notification_id
      )
      VALUES ($1, $2::date, $3::date, $4::bigint)
      ON CONFLICT (recurring_expense_id, reminder_for_date, notified_on) DO NOTHING
    `,
    [id, row.end_date, row.today, notificationResult.notification?.id ?? null],
  );
  return { id, status: "notified" as const, recipientCount: notificationResult.recipientCount };
}

async function scheduleNextRecurringReminderIfNeeded(row: RecurringExpenseReminderRow, createdBy?: number | null) {
  const nextNotifyOn = addDays(row.today, 1);
  const id = Number(row.id);
  return scheduleJob({
    jobKey: recurringReminderJobKey(id, row.end_date, nextNotifyOn),
    title: `Recurring expense reminder: ${row.title}`,
    taskType: "finance_recurring_expense_reminder",
    resourceType: "finance_recurring_expense",
    resourceId: id,
    scopeType: row.scope_type,
    institutionId: row.institution_id,
    runAt: reminderRunAt(nextNotifyOn),
    payload: {
      recurringExpenseId: id,
      endDate: row.end_date,
      notifyOn: nextNotifyOn,
      reminderDaysBefore: row.reminder_days_before,
    },
    createdBy: createdBy ?? null,
  });
}

async function runRecurringExpenseReminderJob(job: ScheduledJobRow) {
  const id = Number(job.payload?.recurringExpenseId ?? job.resource_id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Recurring expense id is missing for reminder job.");
  }

  await ensureFinanceIncomeSchema(db);
  await ensureSystemNotificationTemplates(db);
  const due = await loadDueRecurringExpenseReminderRows(`AND fre.id = $1`, [id], 1);
  const row = due.rows[0];
  if (!row) return;
  await processRecurringExpenseReminder(row, job.created_by);
  await scheduleNextRecurringReminderIfNeeded(row, job.created_by);
}

export async function runRecurringExpenseReminderSweep(limit = 100) {
  await ensureFinanceIncomeSchema(db);
  await ensureScheduledJobsTable();
  await ensureSystemNotificationTemplates(db);

  const due = await loadDueRecurringExpenseReminderRows("", [], limit);
  const results: Array<{ id: number; status: "notified" | "skipped"; recipientCount?: number }> = [];

  for (const row of due.rows) {
    const result = await processRecurringExpenseReminder(row);
    results.push(result);
    await scheduleNextRecurringReminderIfNeeded(row);
  }

  return results;
}

export async function runDueScheduledJobs(limit = 50) {
  await ensureScheduledJobsTable();
  const dueJobs = await db.query<ScheduledJobRow>(
    `
      SELECT *
      FROM scheduled_jobs
      WHERE status = 'active'
        AND run_at <= CURRENT_TIMESTAMP
      ORDER BY run_at ASC
      LIMIT $1
    `,
    [limit],
  );

  const results: Array<{ id: number; status: "completed" | "failed"; error?: string }> = [];

  for (const job of dueJobs.rows) {
    try {
      if (job.task_type === "blog_publish") {
        await runBlogPublishJob(job);
      } else if (job.task_type === "finance_recurring_expense_reminder") {
        await runRecurringExpenseReminderJob(job);
      } else {
        throw new Error(`No scheduled-job handler registered for ${job.task_type}.`);
      }

      await db.query(
        `
          UPDATE scheduled_jobs
          SET status = 'completed',
              completed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP,
              last_error = NULL
          WHERE id = $1
        `,
        [job.id],
      );
      results.push({ id: job.id, status: "completed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scheduled job failed";
      await db.query(
        `
          UPDATE scheduled_jobs
          SET status = 'failed',
              last_error = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [job.id, message],
      );
      results.push({ id: job.id, status: "failed", error: message });
    }
  }

  return results;
}
