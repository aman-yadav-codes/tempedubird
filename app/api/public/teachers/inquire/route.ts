import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fullName, email, phoneNumber, preferredSubject, message, teacherId } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ error: "Full Name is required" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid Email is required" }, { status: 400 });
    }

    if (!phoneNumber || typeof phoneNumber !== "string" || !phoneNumber.trim()) {
      return NextResponse.json({ error: "Phone Number is required" }, { status: 400 });
    }

    // 1. Record inquiry into visitor_sessions pipeline
    try {
      const trackingToken = randomUUID();
      const notesText = `Faculty Mentorship Inquiry for ${preferredSubject || "General"}: ${message || "Interested in learning"} (Faculty ID: ${teacherId || "N/A"})`;
      await db.query(
        `
        INSERT INTO visitor_sessions (
          tracking_token,
          full_name,
          email,
          phone,
          lead_status,
          pipeline_stage,
          estimated_value,
          follow_up,
          notes,
          source_type,
          current_page_url,
          metadata,
          created_at,
          last_seen_at
        ) VALUES (
          $1::uuid, $2, $3, $4, 'new enquiry', 'new enquiry', 15000,
          $5, $5, 'teacher_inquiry', '/teachers', $6, NOW(), NOW()
        )
        `,
        [
          trackingToken,
          fullName.trim(),
          email.trim(),
          phoneNumber.trim(),
          notesText,
          JSON.stringify({
            source_type: "teacher_inquiry",
            teacher_id: teacherId || null,
            preferred_subject: preferredSubject || null,
          }),
        ]
      );
    } catch (vErr) {
      console.error("visitor_sessions insert error:", vErr);
    }

    // 2. Record inquiry into sales_contacts or CRM
    try {
      await db.query(
        `
          INSERT INTO sales_contacts (
            contact_type, full_name, emails, phones, lead_source, sales_stage, remarks
          )
          VALUES ($1, $2, $3::jsonb, $4::jsonb, 'website', 'lead', $5)
        `,
        [
          "student",
          fullName.trim(),
          JSON.stringify([email.trim()]),
          JSON.stringify([{ number: phoneNumber.trim(), is_whatsapp: true }]),
          `Teacher Inquiry for ${preferredSubject || "General"}: ${message || "Interested in learning"} (Teacher ID: ${teacherId || "General"})`,
        ]
      );
    } catch {
      // ignore table schema warnings
    }

    return NextResponse.json({
      success: true,
      message: "Thank you! Your mentorship inquiry has been submitted. The educator / admissions team will reach out to you shortly.",
    });
  } catch (error) {
    console.error("Error submitting teacher inquiry:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
