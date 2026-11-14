import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || !isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Platform Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const typeId = Number(id);

    const typeRes = await db.query(
      `SELECT id, name, slug FROM institution_types WHERE id = $1 AND COALESCE(is_deleted, false) = false`,
      [typeId]
    );

    if (typeRes.rows.length === 0) {
      return NextResponse.json({ error: "Business type not found" }, { status: 404 });
    }

    const bt = typeRes.rows[0];
    const isAcademic = ["school", "college", "university", "institute", "coaching"].some(s => bt.slug.toLowerCase().includes(s));

    const academicRoleCodes = new Set([
      "teacher", "student", "parent", "principal", "vice_principal", "dean",
      "academic_coordinator", "faculty", "tutor", "teaching_assistant",
      "doubt_expert", "counselor", "admission_counselor", "institution_accountant",
      "fee_collector", "exam_controller", "curriculum_developer", "librarian",
      "lab_assistant", "placement_officer", "hostel_warden", "sports_coach"
    ]);

    const allRolesRes = await db.query(
      `SELECT id, code FROM roles WHERE COALESCE(is_deleted, false) = false AND code != 'platform_admin'`
    );
    const allRoles = allRolesRes.rows;

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      for (const role of allRoles) {
        let isEnabled = true;
        if (!isAcademic && academicRoleCodes.has(role.code.toLowerCase())) {
          isEnabled = false;
        }

        await client.query(
          `INSERT INTO business_type_roles (business_type_id, role_id, is_enabled, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (business_type_id, role_id) 
           DO UPDATE SET is_enabled = $3, updated_at = NOW()`,
          [typeId, role.id, isEnabled]
        );
      }

      await client.query(
        `UPDATE institution_types SET updated_at = NOW() WHERE id = $1`,
        [typeId]
      );

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      message: `Roles for "${bt.name}" have been reset to ${isAcademic ? "Academic" : "Commercial"} default rules.`,
    });
  } catch (err: unknown) {
    console.error("[POST /api/admin/business-type-access/[id]/roles/reset] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reset roles" },
      { status: 500 }
    );
  }
}
