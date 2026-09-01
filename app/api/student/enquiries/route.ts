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

    // Auto-link any unlinked visitor_sessions for this user by verified email or phone
    if (userEmail || userPhone) {
      try {
        await db.query(
          `
          UPDATE visitor_sessions
          SET user_id = $1
          WHERE user_id IS NULL
            AND (
              ($2 <> '' AND LOWER(email) = $2)
              OR ($3 <> '' AND phone IS NOT NULL AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = REGEXP_REPLACE($3, '[^0-9]', '', 'g'))
            )
          `,
          [user.id, userEmail, userPhone]
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
        COALESCE(vs.pipeline_stage, vs.lead_status, 'new enquiry') AS status,
        COALESCE(vs.pipeline_stage, 'new enquiry') AS pipeline_stage,
        COALESCE(vs.notes, vs.follow_up, 'Direct Course Enquiry') AS notes,
        COALESCE(prog.title, vs.current_page_url, 'Course Program') AS preferred_program,
        vs.created_at,
        vs.institution_id,
        vs.source_type,
        vs.metadata,
        CASE
          WHEN vs.source_type = 'product' OR vs.follow_up ILIKE '%EduBird Store%' OR vs.follow_up ILIKE '%Product:%' THEN 'EduBird Official Store'
          ELSE COALESCE(ip.name, ip.slug, 'EduBird Partner Institute')
        END AS institution_name,
        prog.id AS program_id,
        prog.title AS program_title
      FROM visitor_sessions vs
      LEFT JOIN institution_profiles ip ON ip.id = vs.institution_id
      LEFT JOIN institution_programs prog ON prog.id = vs.program_id
      WHERE (
        vs.user_id = $1
        OR ($2 <> '' AND LOWER(vs.email) = $2)
        OR ($3 <> '' AND vs.phone IS NOT NULL AND REGEXP_REPLACE(vs.phone, '[^0-9]', '', 'g') = REGEXP_REPLACE($3, '[^0-9]', '', 'g'))
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

    const params: unknown[] = [user.id, userEmail, userPhone];
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
