import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = user.email ? user.email.trim().toLowerCase() : "";
    const userPhone = user.phone ? user.phone.trim() : "";
    const userFullName = user.full_name ? user.full_name.trim() : "";

    // Auto-link any unlinked visitor_sessions for this user strictly by verified email
    if (userEmail) {
      try {
        await db.query(
          `
          UPDATE visitor_sessions
          SET user_id = $1
          WHERE user_id IS NULL
            AND LOWER(email) = $2
          `,
          [user.id, userEmail]
        );
      } catch (linkErr) {
        console.error("Error auto-linking visitor sessions:", linkErr);
      }
    }

    const { searchParams } = new URL(req.url);
    const childProfileId = searchParams.get("student_profile_id") ? Number(searchParams.get("student_profile_id")) : null;
    const childUserId = searchParams.get("child_user_id") ? Number(searchParams.get("child_user_id")) : null;

    let query = `
      SELECT
        vs.id,
        vs.full_name AS student_name,
        vs.phone,
        vs.email,
        vs.lead_status AS status,
        COALESCE(vs.pipeline_stage, 'new enquiry') AS pipeline_stage,
        vs.follow_up AS notes,
        vs.current_page_url AS preferred_program,
        vs.created_at,
        vs.institution_id,
        COALESCE(ip.name, ip.slug, 'Institution') AS institution_name,
        prog.id AS program_id,
        prog.title AS program_title
      FROM visitor_sessions vs
      LEFT JOIN institution_profiles ip ON ip.id = vs.institution_id
      LEFT JOIN institution_programs prog ON prog.id = vs.program_id
      WHERE (
        vs.user_id = $1
        OR (vs.user_id IS NULL AND $2 <> '' AND LOWER(vs.email) = $2)
        OR vs.user_id IN (
          SELECT sp.user_id
          FROM student_guardians sg
          INNER JOIN student_profiles sp ON sp.id = sg.student_id
          WHERE sg.guardian_user_id = $1 AND COALESCE(sg.is_deleted, FALSE) = FALSE
        )
        OR LOWER(vs.email) IN (
          SELECT LOWER(u.email)
          FROM student_guardians sg
          INNER JOIN student_profiles sp ON sp.id = sg.student_id
          INNER JOIN users u ON u.id = sp.user_id
          WHERE sg.guardian_user_id = $1 AND COALESCE(sg.is_deleted, FALSE) = FALSE
        )
      )
    `;

    const params: unknown[] = [user.id, userEmail];
    if (childUserId) {
      params.push(childUserId);
      query += ` AND vs.user_id = $${params.length}`;
    }

    query += ` ORDER BY vs.id DESC`;

    const enquiriesRes = await db.query(query, params);

    return NextResponse.json({
      success: true,
      enquiries: enquiriesRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/student/enquiries error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch student enquiries" }, { status: 500 });
  }
}
