import { NextResponse } from "next/server";

import { withApiDebug } from "@/lib/api/debug";
import { getAuthenticatedUser, getAuthUser } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";

type IdentifierKind = "admission_number" | "apar_id";

function positiveInt(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function identifierLabel(kind: IdentifierKind) {
  return kind === "apar_id" ? "APAR ID" : "Admission number";
}

async function getIdentifierAvailability(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const params = new URL(req.url).searchParams;
    const kind = params.get("kind") as IdentifierKind | null;
    const value = params.get("value")?.trim().toUpperCase() ?? "";
    const institutionId = positiveInt(params.get("institution_id"));
    const excludeStudentUserId = positiveInt(params.get("exclude_student_user_id"));

    if (kind !== "admission_number" && kind !== "apar_id") {
      return NextResponse.json({ error: "Invalid identifier type" }, { status: 400 });
    }
    if (!value) {
      return NextResponse.json({ error: `${identifierLabel(kind)} is required` }, { status: 400 });
    }
    if (kind === "admission_number") {
      if (!institutionId) {
        return NextResponse.json({ error: "Institution is required" }, { status: 400 });
      }
      if (
        isPlatformAdminUser(currentUser) ||
        currentUser.role_codes.includes("platform_admin") ||
        currentUser.role_codes.includes("institution_admin")
      ) {
        assertCanAccessInstitution(currentUser, institutionId);
      }
    }

    const result = kind === "apar_id"
      ? await db.query<{ student_name: string }>(
        `
          SELECT student_user.full_name AS student_name
          FROM student_profiles profile
          INNER JOIN users student_user ON student_user.id = profile.user_id
          WHERE UPPER(profile.apar_id) = $1
            AND ($2::int IS NULL OR profile.user_id <> $2)
          LIMIT 1
        `,
        [value, excludeStudentUserId]
      )
      : await db.query<{ student_name: string }>(
        `
          SELECT student_user.full_name AS student_name
          FROM student_profiles profile
          INNER JOIN users student_user ON student_user.id = profile.user_id
          INNER JOIN student_enrollments enrollment ON enrollment.student_id = profile.id
          WHERE UPPER(profile.admission_number) = $1
            AND enrollment.institution_id = $2
            AND enrollment.status = 'active'
            AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
            AND ($3::int IS NULL OR profile.user_id <> $3)
          LIMIT 1
        `,
        [value, institutionId, excludeStudentUserId]
      );

    const conflict = result.rows[0] ?? null;
    const label = identifierLabel(kind);
    return NextResponse.json({
      available: !conflict,
      conflict,
      message: conflict
        ? `${label} ${value} is already assigned to ${conflict.student_name}.`
        : `${label} is available.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to check identifier";
    const status = message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = withApiDebug(getIdentifierAvailability, "admin.students.identifier_check.get");
