import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  try {
    const notesRes = await db.query(`
      SELECT
        n.id,
        n.institution_id,
        n.title,
        n.subject,
        n.program_name,
        n.file_url,
        n.downloads_count,
        n.author_name,
        n.description,
        n.created_at,
        p.name AS institution_name,
        p.city AS institution_city
      FROM notes n
      LEFT JOIN user_profiles p ON p.id = n.institution_id
      ORDER BY n.id DESC
    `);

    return NextResponse.json({
      success: true,
      notes: notesRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/public/notes error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch lecture notes" }, { status: 500 });
  }
}
