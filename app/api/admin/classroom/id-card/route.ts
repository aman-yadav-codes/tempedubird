import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";
import { db } from "@/lib/db/db";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to load ID card";
  const status = message === "Forbidden: Admin access required"
    ? 403
    : message === "Unauthorized" || message === "User not found"
      ? 401
      : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const canView =
      hasPermission(currentUser, "student.myclassroom.idcard.view") ||
      hasPermission(currentUser, "parent.childclassroom.idcard.view");
    if (!canView) throw new Error("Forbidden: Admin access required");
    const enrollment = await resolveStudentEnrollmentContext(
      db,
      req,
      currentUser.id,
      currentUser.role_codes
    );

    if (!enrollment) {
      return NextResponse.json({ data: null });
    }

    const tableResult = await db.query<{ exists: boolean }>(
      `SELECT to_regclass('public.student_id_cards') IS NOT NULL AS exists`
    );
    if (!tableResult.rows[0]?.exists) return NextResponse.json({ data: null });
    await db.query(`
      ALTER TABLE student_id_cards
        ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL
    `);

    const result = await db.query(
      `
        SELECT
          card.id,
          card.title,
          card.image_url,
          card.rendered_html,
          card.canvas_width,
          card.canvas_height,
          card.version,
          card.created_at,
          card.updated_at,
          institution.name AS institution_name,
          generator.full_name AS generated_by_name
        FROM student_id_cards card
        INNER JOIN institution_profiles institution ON institution.id = card.institution_id
        LEFT JOIN users generator ON generator.id = card.generated_by
        WHERE card.student_id = $1
          AND card.institution_id = $2
          AND card.enrollment_id = $3
          AND card.status = 'active'
          AND COALESCE(card.is_deleted, FALSE) = FALSE
        ORDER BY card.created_at DESC, card.id DESC
        LIMIT 1
      `,
      [enrollment.student_id, enrollment.institution_id, enrollment.id]
    );

    return NextResponse.json({ data: result.rows[0] ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}
