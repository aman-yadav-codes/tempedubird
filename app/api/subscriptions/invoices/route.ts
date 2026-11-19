import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "edubird-secret-key-change-in-prod";

async function getAuthUserId(req: Request): Promise<number | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && (decoded.userId || decoded.id || decoded.sub)) {
        return Number(decoded.userId || decoded.id || decoded.sub);
      }
    }
  } catch (err) {
    // ignore
  }
  return null;
}

export async function GET(req: Request) {
  try {
    let userId = await getAuthUserId(req);
    if (!userId) {
      const demoUser = await db.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`);
      userId = demoUser.rows[0]?.id || 1;
    }

    const invoices = await db.query(
      `
      SELECT * FROM subscription_invoices 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 20
      `,
      [userId]
    );

    return NextResponse.json({
      success: true,
      invoices: invoices.rows,
    });
  } catch (error) {
    console.error("Error in GET /api/subscriptions/invoices:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load invoices" },
      { status: 500 }
    );
  }
}
