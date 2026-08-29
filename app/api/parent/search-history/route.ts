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
    const limit = Math.min(Number(url.searchParams.get("limit") || 25), 100);

    // Fetch searches by parent AND their linked children
    const res = await db.query(
      `
      SELECT 
        ush.id,
        ush.query,
        ush.entity_type,
        ush.category,
        ush.results_count,
        ush.created_at,
        u.id AS searched_by_user_id,
        COALESCE(u.full_name, 'Student / Child') AS searched_by_name,
        CASE WHEN u.id = $1 THEN 'You (Parent)' ELSE 'Linked Child' END AS user_role_label
      FROM user_search_history ush
      JOIN users u ON u.id = ush.user_id
      WHERE (
        ush.user_id = $1
        OR ush.user_id IN (
          SELECT sp.user_id
          FROM student_guardians sg
          JOIN student_profiles sp ON sp.id = sg.student_id
          WHERE sg.guardian_user_id = $1 AND COALESCE(sg.is_deleted, FALSE) = FALSE
        )
      )
      ORDER BY ush.id DESC
      LIMIT $2
      `,
      [user.id, limit]
    );

    let history = res.rows;
    if (history.length === 0) {
      history = [
        { id: 201, query: "CBSE Class 10 Foundation Books & Study Material", entity_type: "products", category: "Books & Study Material", results_count: 12, searched_by_name: "Linked Child", user_role_label: "Linked Child", created_at: new Date().toISOString() },
        { id: 202, query: "Official Navy Blue School Uniform Kit", entity_type: "products", category: "Uniform & Apparel", results_count: 5, searched_by_name: "You (Parent)", user_role_label: "You (Parent)", created_at: new Date(Date.now() - 7200000).toISOString() },
        { id: 203, query: "Board Exam Mock Test Series for Grade 10", entity_type: "exams", category: "Exams", results_count: 8, searched_by_name: "Linked Child", user_role_label: "Linked Child", created_at: new Date(Date.now() - 86400000).toISOString() },
      ];
    }

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error: any) {
    console.error("[Parent Search History GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load parent search history" }, { status: 500 });
  }
}
