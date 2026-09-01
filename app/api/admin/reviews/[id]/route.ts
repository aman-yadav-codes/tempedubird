import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthUser } from "@/lib/auth/auth";

export async function PATCH(
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
    const { status, title, comment, rating } = body;

    const isPlatformAdmin = Boolean(
      user.role_codes?.includes("platform_admin") ||
      user.role_codes?.includes("super_admin") ||
      (user as any)?.is_super_admin
    );

    const isInstitutionAdmin = Boolean(
      user.role_codes?.includes("institution_admin") ||
      user.role_codes?.includes("school_owner") ||
      user.role_codes?.includes("college_owner")
    );

    // If status change, require admin
    if (status && !isPlatformAdmin && !isInstitutionAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let updates: string[] = [];
    const queryParams: any[] = [];

    if (status) {
      queryParams.push(status);
      updates.push(`status = $${queryParams.length}`);
    }

    if (title !== undefined) {
      queryParams.push(title);
      updates.push(`title = $${queryParams.length}`);
    }

    if (comment !== undefined) {
      queryParams.push(comment);
      updates.push(`comment = $${queryParams.length}`);
    }

    if (rating !== undefined) {
      queryParams.push(Math.min(5, Math.max(1, Number(rating))));
      updates.push(`rating = $${queryParams.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields provided to update" }, { status: 400 });
    }

    queryParams.push(reviewId);
    const result = await db.query(
      `
      UPDATE entity_reviews
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${queryParams.length}
      RETURNING *
      `,
      queryParams
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Review updated successfully",
      review: result.rows[0],
    });
  } catch (err: any) {
    console.error("PATCH /api/admin/reviews/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to update review" }, { status: 500 });
  }
}

export async function DELETE(
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

    const isPlatformAdmin = Boolean(
      user.role_codes?.includes("platform_admin") ||
      user.role_codes?.includes("super_admin") ||
      (user as any)?.is_super_admin
    );

    // Platform admin can delete any; author can delete their own
    let query = `DELETE FROM entity_reviews WHERE id = $1`;
    const qParams: any[] = [reviewId];

    if (!isPlatformAdmin) {
      query += ` AND user_id = $2`;
      qParams.push(user.id);
    }

    const result = await db.query(query, qParams);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Review not found or unauthorized to delete" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (err: any) {
    console.error("DELETE /api/admin/reviews/[id] error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete review" }, { status: 500 });
  }
}
