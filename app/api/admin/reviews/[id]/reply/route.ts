import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthUser } from "@/lib/auth/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const reviewId = Number(id);
    if (!reviewId) {
      return NextResponse.json({ error: "Invalid review ID" }, { status: 400 });
    }

    const body = await req.json();
    const { reply } = body;

    if (!reply || !reply.trim()) {
      return NextResponse.json({ error: "Reply message cannot be empty" }, { status: 400 });
    }

    const isPlatformAdmin = Boolean(
      user.role_codes?.includes("platform_admin") ||
      user.role_codes?.includes("super_admin") ||
      (user as any)?.is_super_admin
    );

    const isInstitutionAdmin = Boolean(
      user.role_codes?.includes("institution_admin") ||
      user.role_codes?.includes("school_owner") ||
      user.role_codes?.includes("college_owner") ||
      user.role_codes?.includes("university_owner") ||
      user.role_codes?.includes("teacher")
    );

    if (!isPlatformAdmin && !isInstitutionAdmin) {
      return NextResponse.json({ error: "Forbidden: Only institution staff or platform administrators can reply to feedback." }, { status: 403 });
    }

    const result = await db.query(
      `
      UPDATE entity_reviews
      SET
        institution_reply = $1,
        institution_replied_at = NOW(),
        institution_replied_by = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [reply.trim(), user.id, reviewId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Official reply published successfully.",
      review: result.rows[0],
    });
  } catch (err: any) {
    console.error("POST /api/admin/reviews/[id]/reply error:", err);
    return NextResponse.json({ error: err.message || "Failed to post reply" }, { status: 500 });
  }
}
