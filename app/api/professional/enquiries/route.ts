import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await db.query(
      `SELECT 
         ci.*,
         pp.name AS professional_name
       FROM customer_inquiries ci
       JOIN professional_profiles pp ON pp.id = ci.professional_id
       WHERE pp.user_id = $1
       ORDER BY ci.id DESC`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      enquiries: res.rows,
    });
  } catch (err: unknown) {
    console.error("[GET /api/professional/enquiries] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load enquiries" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Enquiry id and status are required" }, { status: 400 });
    }

    const check = await db.query(
      `SELECT ci.id 
       FROM customer_inquiries ci
       JOIN professional_profiles pp ON pp.id = ci.professional_id
       WHERE ci.id = $1 AND pp.user_id = $2 LIMIT 1`,
      [Number(id), user.id]
    );

    if (!check.rows[0]) {
      return NextResponse.json({ error: "Enquiry not found or unauthorized" }, { status: 403 });
    }

    await db.query(`UPDATE customer_inquiries SET status = $1 WHERE id = $2`, [status, Number(id)]);

    return NextResponse.json({ success: true, message: "Enquiry status updated" });
  } catch (err: unknown) {
    console.error("[PATCH /api/professional/enquiries] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update enquiry" },
      { status: 500 }
    );
  }
}

