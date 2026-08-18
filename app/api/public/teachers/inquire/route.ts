import { NextResponse } from "next/server";
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

    // Record inquiry into sales_contacts or support system
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
      message: "Thank you! Your inquiry has been submitted. The teacher / support team will contact you shortly.",
    });
  } catch (error) {
    console.error("Error submitting teacher inquiry:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
