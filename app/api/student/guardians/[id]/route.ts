import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const guardianRecordId = Number(id);

    if (!guardianRecordId || isNaN(guardianRecordId)) {
      return NextResponse.json({ error: "Invalid guardian ID" }, { status: 400 });
    }

    const result = await db.query(
      `
      UPDATE student_guardians sg
      SET is_deleted = TRUE
      FROM student_profiles sp
      WHERE sg.id = $1
        AND sg.student_id = sp.id
        AND sp.user_id = $2
      `,
      [guardianRecordId, user.id]
    );

    const success = (result.rowCount ?? 0) > 0;

    return NextResponse.json({
      success,
      message: success ? "Guardian removed successfully" : "Guardian record not found",
    });
  } catch (err: any) {
    console.error("DELETE /api/student/guardians/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to remove guardian" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const guardianRecordId = Number(id);
    const body = await req.json();
    const { is_primary, relationship, occupation } = body;

    // Get student profile
    const spRes = await db.query<{ id: number }>(
      `SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1`,
      [user.id]
    );
    const studentProfileId = spRes.rows[0]?.id;
    if (!studentProfileId) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    if (is_primary) {
      await db.query(
        `UPDATE student_guardians SET is_primary = FALSE WHERE student_id = $1`,
        [studentProfileId]
      );
    }

    const updateRes = await db.query(
      `
      UPDATE student_guardians
      SET
        is_primary = COALESCE($1, is_primary),
        relationship = COALESCE($2, relationship),
        occupation = COALESCE($3, occupation)
      WHERE id = $4 AND student_id = $5
      RETURNING *
      `,
      [
        is_primary !== undefined ? Boolean(is_primary) : null,
        relationship ? String(relationship).trim() : null,
        occupation !== undefined ? (occupation ? String(occupation).trim() : null) : null,
        guardianRecordId,
        studentProfileId,
      ]
    );

    return NextResponse.json({
      success: true,
      data: updateRes.rows[0],
      message: "Guardian record updated successfully",
    });
  } catch (err: any) {
    console.error("PATCH /api/student/guardians/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update guardian" },
      { status: 500 }
    );
  }
}
