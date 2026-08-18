import { db } from "@/lib/db/db";

let complaintSchemaReady: Promise<void> | null = null;

export function ensureInstitutionComplaintSchema() {
  if (!complaintSchemaReady) {
    complaintSchemaReady = db.query(`
      CREATE TABLE IF NOT EXISTS institution_complaints (
        id SERIAL PRIMARY KEY,
        complaint_number VARCHAR(40) NOT NULL UNIQUE,
        institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
        academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        creator_role VARCHAR(40) NOT NULL,
        target_role VARCHAR(40) NOT NULL,
        target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        subject VARCHAR(180) NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'normal',
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMP
      );

      ALTER TABLE institution_complaints
        ADD COLUMN IF NOT EXISTS target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

      ALTER TABLE institution_complaints
        ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'normal';

      ALTER TABLE institution_complaints
        ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL;

      UPDATE institution_complaints complaint
      SET academic_year_id = (
        SELECT academic_year.id
        FROM academic_years academic_year
        WHERE academic_year.institution_id = complaint.institution_id
          AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
          AND COALESCE(academic_year.is_active, TRUE) = TRUE
        ORDER BY
          CASE WHEN CURRENT_DATE BETWEEN academic_year.start_date AND academic_year.end_date THEN 0 ELSE 1 END,
          academic_year.start_date DESC,
          academic_year.id DESC
        LIMIT 1
      )
      WHERE complaint.academic_year_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM academic_years academic_year
          WHERE academic_year.institution_id = complaint.institution_id
            AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
            AND COALESCE(academic_year.is_active, TRUE) = TRUE
        );

      UPDATE institution_complaints complaint
      SET target_user_id = (
        SELECT membership.user_id
        FROM institution_memberships membership
        INNER JOIN roles role ON role.id = membership.role_id
        INNER JOIN users recipient ON recipient.id = membership.user_id
        WHERE membership.institution_id = complaint.institution_id
          AND role.code = complaint.target_role
          AND membership.is_active = TRUE
          AND COALESCE(membership.is_deleted, FALSE) = FALSE
          AND recipient.is_active = TRUE
          AND COALESCE(recipient.is_deleted, FALSE) = FALSE
        ORDER BY membership.id
        LIMIT 1
      )
      WHERE complaint.target_user_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM institution_memberships membership
          INNER JOIN roles role ON role.id = membership.role_id
          INNER JOIN users recipient ON recipient.id = membership.user_id
          WHERE membership.institution_id = complaint.institution_id
            AND role.code = complaint.target_role
            AND membership.is_active = TRUE
            AND COALESCE(membership.is_deleted, FALSE) = FALSE
            AND recipient.is_active = TRUE
            AND COALESCE(recipient.is_deleted, FALSE) = FALSE
        );

      CREATE TABLE IF NOT EXISTS institution_complaint_messages (
        id BIGSERIAL PRIMARY KEY,
        complaint_id INTEGER NOT NULL REFERENCES institution_complaints(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        reply_to_message_id BIGINT REFERENCES institution_complaint_messages(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        edited_at TIMESTAMP
      );

      ALTER TABLE institution_complaint_messages
        ADD COLUMN IF NOT EXISTS reply_to_message_id BIGINT REFERENCES institution_complaint_messages(id) ON DELETE SET NULL;

      CREATE TABLE IF NOT EXISTS institution_complaint_attachments (
        id BIGSERIAL PRIMARY KEY,
        message_id BIGINT NOT NULL REFERENCES institution_complaint_messages(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        public_id TEXT,
        resource_type VARCHAR(30),
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_institution_complaints_institution_updated
        ON institution_complaints(institution_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_institution_complaints_session
        ON institution_complaints(institution_id, academic_year_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_institution_complaints_creator
        ON institution_complaints(created_by, institution_id);
      CREATE INDEX IF NOT EXISTS idx_institution_complaints_target
        ON institution_complaints(institution_id, target_role, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_institution_complaints_target_user
        ON institution_complaints(institution_id, target_user_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_institution_complaint_messages_thread
        ON institution_complaint_messages(complaint_id, id);
      CREATE INDEX IF NOT EXISTS idx_institution_complaint_messages_reply
        ON institution_complaint_messages(reply_to_message_id);
      CREATE INDEX IF NOT EXISTS idx_institution_complaint_attachments_message
        ON institution_complaint_attachments(message_id, id);
    `).then(() => undefined).catch((error) => {
      complaintSchemaReady = null;
      throw error;
    });
  }

  return complaintSchemaReady;
}
