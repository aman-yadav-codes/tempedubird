import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

export const dynamic = "force-dynamic";

function getStatus(message: string) {
  if (message === "Unauthorized" || message === "User not found") return 401;
  if (message.includes("Forbidden")) return 403;
  return 500;
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser.role_codes.includes("parent")) {
      throw new Error("Forbidden: Parent access required");
    }

    const children = await db.query(
      `
        SELECT DISTINCT ON (sp.id)
          sp.id AS student_id,
          sp.user_id,
          student.full_name AS name,
          ip.name AS institution_name,
          sg.relationship
        FROM student_guardians sg
        INNER JOIN student_profiles sp
          ON sp.id = sg.student_id
        INNER JOIN users student
          ON student.id = sp.user_id
         AND student.is_active = TRUE
         AND COALESCE(student.is_deleted, FALSE) = FALSE
        LEFT JOIN student_enrollments se
          ON se.student_id = sp.id
         AND se.status = 'active'
         AND COALESCE(se.is_deleted, FALSE) = FALSE
        LEFT JOIN institution_profiles ip
          ON ip.id = se.institution_id
         AND ip.is_active = TRUE
         AND COALESCE(ip.is_deleted, FALSE) = FALSE
        WHERE sg.guardian_user_id = $1
          AND COALESCE(sg.is_deleted, FALSE) = FALSE
        ORDER BY sp.id, sg.is_primary DESC, sg.id ASC
      `,
      [currentUser.id]
    );

    return NextResponse.json({
      data: children.rows.map((child) => ({
        studentId: Number(child.student_id),
        userId: Number(child.user_id),
        name: child.name,
        institutionName: child.institution_name,
        relationship: child.relationship,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load children";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}
