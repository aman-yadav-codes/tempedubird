import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);

    const res = await db.query(
      `
      SELECT id, query, entity_type, category, results_count, created_at
      FROM user_search_history
      WHERE user_id = $1
      ORDER BY id DESC
      LIMIT $2
      `,
      [user.id, limit]
    );

    // If no searches recorded yet, provide relevant initial student search hints
    let history = res.rows;
    if (history.length === 0) {
      history = [
        { id: 101, query: "CBSE Class 10 Board Prep Formula Sheets", entity_type: "notes", category: "Secondary Education", results_count: 14, created_at: new Date().toISOString() },
        { id: 102, query: "JEE Advanced Engineering Mock Test 2026", entity_type: "exams", category: "Competitive Exams", results_count: 8, created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 103, query: "Robotics and IoT Starter STEM Kit", entity_type: "products", category: "Lab & Kits", results_count: 6, created_at: new Date(Date.now() - 86400000).toISOString() },
      ];
    }

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error: any) {
    console.error("[Student Search History GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load search history" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      await db.query(`DELETE FROM user_search_history WHERE id = $1 AND user_id = $2`, [Number(id), user.id]);
    } else {
      await db.query(`DELETE FROM user_search_history WHERE user_id = $1`, [user.id]);
    }

    return NextResponse.json({
      success: true,
      message: "Search history cleared",
    });
  } catch (error: any) {
    console.error("[Student Search History DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to clear search history" }, { status: 500 });
  }
}
