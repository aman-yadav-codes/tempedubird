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
      ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'edubird';
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
    let programId = body.program_id && !isNaN(Number(body.program_id)) ? Number(body.program_id) : null;
    let institutionId = body.institution_id && !isNaN(Number(body.institution_id)) && Number(body.institution_id) > 0 ? Number(body.institution_id) : null;
    const source = String(body.source || "").trim();
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
    if (programId && !institutionId) {
      const progRes = await db.query<{ institution_id: number; title: string }>(
        `SELECT institution_id, title FROM institution_programs WHERE id = $1 LIMIT 1`,
        [programId]
      );
      if (progRes.rows.length > 0 && progRes.rows[0].institution_id) {
        institutionId = progRes.rows[0].institution_id;
        if (!preferredProgram) {
          preferredProgram = progRes.rows[0].title;
        }
      }
    }

    if (!phone) {
      phone = "Not provided";
    }

    const parentName = String(body.parent_name || "").trim();
    const parentPhone = String(body.parent_phone || "").trim();
    const parentEmail = String(body.parent_email || "").trim();
    const childName = String(body.child_name || "").trim();

    // Determine Origin / Source:
    // 1. If product inquiry -> "Store Product"
    // 2. If explicitly provided custom source (e.g. Walk-in, Phone Call, Referral, etc.) -> use provided source
    // 3. If institution_id is present (ID basis) -> "Own Website"
    // 4. If no institution_id is stored -> "EduBird"
    const isProductInquiry = Boolean(
      body.source_type === "product" ||
      body.product_id ||
      source.toLowerCase().includes("product")
    );

    let displaySource = "EduBird";
    let storedSourceType = "edubird";

    if (isProductInquiry) {
      displaySource = "Store Product";
      storedSourceType = "product";
    } else if (
      body.source &&
      !["website course inquiry", "platform inquiry", "edubird", "website"].includes(body.source.toLowerCase()) &&
      !body.source.toLowerCase().startsWith("website ")
    ) {
      displaySource = body.source;
      storedSourceType = body.source;
    } else if (
      body.source_type &&
      !["edubird", "own_website", "institution_website", "institution", "product"].includes(body.source_type.toLowerCase())
    ) {
      displaySource = body.source_type;
      storedSourceType = body.source_type;
    } else if (institutionId) {
      displaySource = "Own Website";
      storedSourceType = "own_website";
    } else {
      displaySource = "EduBird";
      storedSourceType = "edubird";
    }

    const trackingToken = randomUUID();
    const fullNotes = [
      notes,
      isProductInquiry ? `Product: ${preferredProgram}` : `Program: ${preferredProgram}`,
      `Origin: ${displaySource}`,
      parentName ? `Parent: ${parentName} (${parentPhone || "No phone"})` : "",
      childName ? `Child: ${childName}` : "",
      `Source: ${displaySource}`,
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
        source_type,
        metadata,
        created_at,
        last_seen_at
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, 'new enquiry', 'new enquiry', 25000, $8, $9, $10, $11, NOW(), NOW())
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
        storedSourceType,
        JSON.stringify({
          source: displaySource,
          source_type: storedSourceType,
          origin_source: displaySource,
          parent_name: parentName || null,
          parent_phone: parentPhone || null,
          parent_email: parentEmail || null,
          child_name: childName || null,
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      id: res.rows[0]?.id,
      institution_id: institutionId,
      source: displaySource,
      source_type: storedSourceType,
      origin_source: displaySource,
      message: "Enquiry submitted successfully",
    });
  } catch (err: any) {
    console.error("POST /api/public/enquiries error:", err);
    return NextResponse.json({ error: err.message || "Failed to record enquiry" }, { status: 500 });
  }
}
