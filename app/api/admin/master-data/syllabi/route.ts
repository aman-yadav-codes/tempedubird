import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

// GET: List master course syllabi for marketplace & templates
export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim().toLowerCase() || "";
    const subjectId = url.searchParams.get("subjectId")?.trim() || "";
    const courseId = url.searchParams.get("courseId")?.trim() || "";
    const limit = Number(url.searchParams.get("limit") || "100");

    let query = `
      SELECT 
        css.id,
        css.course_id,
        mc.name AS course_name,
        mc.code AS course_code,
        css.subject_id,
        css.subject_name,
        css.subject_code,
        css.term_name,
        css.term_number,
        css.units,
        css.created_at,
        css.updated_at
      FROM course_subject_syllabi css
      LEFT JOIN master_courses mc ON mc.id = css.course_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (subjectId) {
      params.push(subjectId);
      query += ` AND (css.subject_id = $${params.length} OR css.subject_name ILIKE $${params.length})`;
    }

    if (courseId) {
      params.push(Number(courseId));
      query += ` AND css.course_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        LOWER(css.subject_name) LIKE $${params.length} 
        OR LOWER(COALESCE(mc.name, '')) LIKE $${params.length}
        OR LOWER(COALESCE(css.term_name, '')) LIKE $${params.length}
      )`;
    }

    query += ` ORDER BY css.id DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const res = await db.query(query, params);
    
    const formatted = res.rows.map((r: any) => {
      const units = Array.isArray(r.units) ? r.units : [];
      let totalTopics = 0;
      let totalHours = 0;
      units.forEach((u: any) => {
        (u.chapters || []).forEach((c: any) => {
          totalHours += Number(c.estimated_hours) || 0;
          totalTopics += (c.lessons || c.topics || []).length || 1;
        });
      });

      return {
        id: r.id,
        title: `${r.course_name ? `${r.course_name} — ` : ""}${r.subject_name} (${r.term_name || "Standard"})`,
        category_name: r.course_name || "Standard Curriculum",
        subject_id: r.subject_id,
        subject_name: r.subject_name,
        term_name: r.term_name,
        course_id: r.course_id,
        modules_count: units.length,
        total_topics: totalTopics,
        total_hours: totalHours,
        units,
        updated_at: r.updated_at,
      };
    });

    return NextResponse.json({ data: formatted });
  } catch (err: any) {
    console.error("GET /api/admin/master-data/syllabi error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch master syllabi" },
      { status: 500 }
    );
  }
}
