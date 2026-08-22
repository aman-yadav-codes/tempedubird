import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db/db";
import { getAuthUser } from "@/lib/auth/auth";

let schemaEnquiryColumnsReady = false;
async function ensureEnquiriesSchema() {
  if (schemaEnquiryColumnsReady) return;
  try {
    await db.query(`
      ALTER TABLE visitor_sessions ALTER COLUMN tracking_token DROP NOT NULL;
    `);
  } catch {}
  try {
    await db.query(`
      ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS program_id INTEGER REFERENCES institution_programs(id) ON DELETE SET NULL;
      ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE SET NULL;
      ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) DEFAULT 'new enquiry';
      ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(12,2) DEFAULT 25000;
    `);
    schemaEnquiryColumnsReady = true;
  } catch (err) {
    console.error("Error setting up visitor_sessions schema:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureEnquiriesSchema();
    const body = await req.json();

    const authUser = await getAuthUser(req);
    let userId = body.user_id ? Number(body.user_id) : (authUser ? authUser.id : null);

    const studentName = String(body.student_name || body.full_name || authUser?.full_name || "Student").trim();
    let phone = String(body.phone || body.contact_phone || authUser?.phone || "").trim();
    let email = String(body.email || body.email_address || authUser?.email || "").trim();
    let preferredProgram = String(body.preferred_program || body.course || "").trim();
    let programId = body.program_id ? Number(body.program_id) : null;
    let institutionId = body.institution_id ? Number(body.institution_id) : null;
    const source = String(body.source || "Website Course Inquiry").trim();
    const notes = String(body.notes || body.message || "").trim();

    if (!userId && (email || phone)) {
      try {
        const userMatch = await db.query<{ id: number }>(
          `
          SELECT id FROM users
          WHERE ($1 <> '' AND LOWER(email) = LOWER($1))
             OR ($2 <> '' AND phone IS NOT NULL AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = REGEXP_REPLACE($2, '[^0-9]', '', 'g'))
          LIMIT 1
          `,
          [email, phone]
        );
        if (userMatch.rows.length > 0) {
          userId = userMatch.rows[0].id;
        }
      } catch {}
    }

    // Auto-resolve accurate institution_id and program title if programId is provided
    if (programId) {
      const progRes = await db.query<{ institution_id: number; title: string }>(
        `SELECT institution_id, title FROM institution_programs WHERE id = $1 LIMIT 1`,
        [programId]
      );
      if (progRes.rows.length > 0) {
        if (!institutionId || institutionId === 1) {
          institutionId = progRes.rows[0].institution_id;
        }
        if (!preferredProgram) {
          preferredProgram = progRes.rows[0].title;
        }
      }
    }

    if (!institutionId) {
      institutionId = 1;
    }

    if (!phone) {
      phone = "Not provided";
    }

    const trackingToken = randomUUID();
    const fullNotes = [
      notes,
      `Program: ${preferredProgram}`,
      `Source: ${source}`,
    ].filter(Boolean).join(" | ");

    const res = await db.query(
      `
      INSERT INTO visitor_sessions (
        tracking_token,
        institution_id,
        program_id,
        user_id,
        full_name,
        phone,
        email,
        lead_status,
        pipeline_stage,
        estimated_value,
        follow_up,
        current_page_url,
        created_at,
        last_seen_at
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, 'new enquiry', 'new enquiry', 25000, $8, $9, NOW(), NOW())
      RETURNING id
      `,
      [
        trackingToken,
        institutionId,
        programId,
        userId,
        studentName,
        phone,
        email || null,
        fullNotes,
        preferredProgram || "/courses",
      ]
    );

    return NextResponse.json({
      success: true,
      id: res.rows[0]?.id,
      institution_id: institutionId,
      message: "Enquiry submitted successfully",
    });
  } catch (err: any) {
    console.error("POST /api/public/enquiries error:", err);
    return NextResponse.json({ error: err.message || "Failed to record enquiry" }, { status: 500 });
  }
}
