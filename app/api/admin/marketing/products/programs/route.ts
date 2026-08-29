import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { featuredCourses } from "@/lib/data/home-data";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthUser(req);
    const url = new URL(req.url);
    const instIdParam = url.searchParams.get("institution_id");

    const isPlatformAdmin = Boolean(
      user?.role_codes?.some((r: string) => r.includes("super") || r.includes("platform")) ||
      (user as any)?.role === "platform_admin" ||
      (user as any)?.is_super_admin
    );

    let institutionId: number | null = null;
    if (instIdParam && !isNaN(Number(instIdParam)) && instIdParam !== "all") {
      institutionId = Number(instIdParam);
    } else if (!isPlatformAdmin && user?.memberships?.length) {
      const instMem = user.memberships.find((m: any) => m.institution_id);
      if (instMem) institutionId = Number(instMem.institution_id);
    }

    const whereClause = institutionId
      ? `WHERE (prog.institution_id = ${institutionId} OR prog.institution_id IS NULL) AND COALESCE(prog.is_deleted, false) = false`
      : `WHERE COALESCE(prog.is_deleted, false) = false`;

    let dbPrograms: any[] = [];
    try {
      const query = `
        SELECT 
          prog.id,
          prog.title,
          prog.slug,
          ip.name AS institution_name,
          COALESCE(prog.admission_fee, prog.fee_amount) AS fee_amount
        FROM institution_programs prog
        LEFT JOIN institution_profiles ip ON ip.id = prog.institution_id
        ${whereClause}
        ORDER BY prog.id DESC
        LIMIT 250
      `;
      const res = await db.query(query);
      dbPrograms = res.rows;
    } catch (dbErr) {
      console.error("[Programs Options Query Error]", dbErr);
    }

    // Merge content courses from featuredCourses as fallback/additional programs
    const contentPrograms = featuredCourses.map((c: any, idx: number) => ({
      id: 10000 + (c.id || idx + 1),
      title: c.title,
      slug: c.slug || `course-${idx + 1}`,
      institution_name: c.institute || "EduBird Content Library",
      fee_amount: c.price,
    }));

    // Combine distinct programs
    const seenTitles = new Set<string>();
    const combinedPrograms: any[] = [];

    for (const prog of [...dbPrograms, ...contentPrograms]) {
      const key = `${prog.title.toLowerCase().trim()}-${(prog.institution_name || "").toLowerCase().trim()}`;
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        combinedPrograms.push(prog);
      }
    }

    return NextResponse.json({
      success: true,
      programs: combinedPrograms,
      total: combinedPrograms.length,
    });
  } catch (error: any) {
    console.error("[Product Programs Options GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch programs" }, { status: 500 });
  }
}
