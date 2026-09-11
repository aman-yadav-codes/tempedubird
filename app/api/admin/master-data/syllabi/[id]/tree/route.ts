import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

// GET: Fetch tree structure for a master syllabus template
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sylId = Number(id);
    if (!sylId || isNaN(sylId)) {
      return NextResponse.json({ error: "Invalid syllabus ID" }, { status: 400 });
    }

    const res = await db.query(
      `SELECT id, course_id, subject_id, subject_name, subject_code, term_name, units
       FROM course_subject_syllabi
       WHERE id = $1 LIMIT 1`,
      [sylId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Syllabus template not found" }, { status: 404 });
    }

    const row = res.rows[0];
    const units = Array.isArray(row.units) ? row.units : [];

    const nodes = units.map((u: any, uIdx: number) => {
      const unitNum = u.unit_number ?? uIdx + 1;
      const unitTitle = u.title?.trim() || `Unit ${unitNum}`;
      const unitDesc = u.description || "";

      const chapters = (u.chapters || []).map((c: any, cIdx: number) => {
        const chapNum = c.chapter_number ?? `${unitNum}.${cIdx + 1}`;
        const chapTitle = c.title?.trim() || `Chapter ${chapNum}`;
        const chapDesc = c.description || "";
        const chapHours = c.estimated_hours != null ? Number(c.estimated_hours) : null;

        const topics = (c.lessons || c.topics || c.children || []).map((t: any, tIdx: number) => {
          const topNum = t.lesson_number ?? t.topic_number ?? `${chapNum}.${tIdx + 1}`;
          const topTitle = t.title?.trim() || `Topic ${topNum}`;
          const topDesc = t.description || "";
          const topHours = t.duration_mins
            ? Math.round(Number(t.duration_mins) / 60) || 1
            : (t.estimated_hours != null ? Number(t.estimated_hours) : null);

          return {
            id: t.id ? String(t.id) : `top-${topNum}-${Date.now()}-${tIdx}`,
            title: topTitle,
            description: topDesc,
            node_type: "topic",
            estimated_hours: topHours,
            learning_outcomes: t.learning_outcomes || "",
            sort_order: tIdx * 10,
          };
        });

        return {
          id: c.id ? String(c.id) : `chap-${chapNum}-${Date.now()}-${cIdx}`,
          title: chapTitle,
          description: chapDesc,
          node_type: "chapter",
          estimated_hours: chapHours,
          learning_outcomes: c.learning_outcomes || "",
          sort_order: cIdx * 10,
          children: topics,
        };
      });

      const unitHours = u.estimated_hours != null
        ? Number(u.estimated_hours)
        : chapters.reduce((acc: number, chap: any) => {
            const chH = chap.estimated_hours || 0;
            const topH = (chap.children || []).reduce((tAcc: number, t: any) => tAcc + (t.estimated_hours || 0), 0);
            return acc + Math.max(chH, topH);
          }, 0) || null;

      return {
        id: u.id ? String(u.id) : `unit-${unitNum}-${Date.now()}-${uIdx}`,
        title: unitTitle,
        description: unitDesc,
        node_type: "unit",
        estimated_hours: unitHours,
        sort_order: uIdx * 10,
        children: chapters,
      };
    });

    return NextResponse.json({
      data: nodes,
      syllabus: row,
    });
  } catch (err: any) {
    console.error("GET /api/admin/master-data/syllabi/[id]/tree error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch syllabus tree" },
      { status: 500 }
    );
  }
}
