import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { generateDefaultSyllabusForSubject } from "@/lib/utils/syllabus-generator";

async function ensureCourseSyllabusTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS course_subject_syllabi (
      id SERIAL PRIMARY KEY,
      course_id INT NOT NULL,
      subject_id VARCHAR(100) NOT NULL,
      subject_name VARCHAR(255) NOT NULL,
      subject_code VARCHAR(100),
      term_name VARCHAR(100),
      term_number INT,
      units JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT unique_course_subject_syllabus UNIQUE (course_id, subject_id)
    );
    CREATE INDEX IF NOT EXISTS idx_course_subject_syllabi_course ON course_subject_syllabi(course_id);
  `);
}

// GET: Fetch all subject syllabi for a course or institution program
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
    const courseId = Number(id);
    if (!courseId || isNaN(courseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    const url = new URL(req.url);
    const filterSubjectId = url.searchParams.get("subjectId")?.trim();
    const filterSubjectName = url.searchParams.get("subjectName")?.trim();

    try {
      await ensureCourseSyllabusTable();
    } catch {
      // Table may already exist
    }

    // 1. Fetch existing configured syllabi from course_subject_syllabi for this courseId
    let rows: any[] = [];
    try {
      const res = await db.query(
        `SELECT id, course_id, subject_id, subject_name, subject_code, term_name, term_number, units, updated_at
         FROM course_subject_syllabi
         WHERE course_id = $1
         ORDER BY term_number ASC, subject_name ASC`,
        [courseId]
      );
      rows = (res.rows || []).filter(r => Array.isArray(r.units) && r.units.length > 0);
    } catch (dbErr) {
      console.warn("Could not query course_subject_syllabi directly:", dbErr);
    }

    // 2. If no rows found, check if courseId is an institution program or master course cross-link
    if (rows.length === 0) {
      try {
        // Check if courseId is an institution program
        const progRes = await db.query(
          `SELECT id, title, master_course_id FROM institution_programs WHERE id = $1 LIMIT 1`,
          [courseId]
        );
        if (progRes.rows[0]) {
          const prog = progRes.rows[0];
          const candidateCourseIds: number[] = [];
          if (prog.master_course_id) candidateCourseIds.push(Number(prog.master_course_id));

          // Also match master course by program title
          if (prog.title) {
            const mcRes = await db.query(
              `SELECT id FROM master_courses 
               WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) 
                  OR LOWER(TRIM($1)) LIKE LOWER(CONCAT('%', TRIM(name), '%'))
                  OR LOWER(TRIM(name)) LIKE LOWER(CONCAT('%', TRIM($1), '%'))
               LIMIT 3`,
              [prog.title]
            );
            mcRes.rows.forEach(r => candidateCourseIds.push(Number(r.id)));
          }

          if (candidateCourseIds.length > 0) {
            const res = await db.query(
              `SELECT id, course_id, subject_id, subject_name, subject_code, term_name, term_number, units, updated_at
               FROM course_subject_syllabi
               WHERE course_id = ANY($1::int[])
               ORDER BY term_number ASC, subject_name ASC`,
              [candidateCourseIds]
            );
            rows = (res.rows || []).filter(r => Array.isArray(r.units) && r.units.length > 0);
          }
        } else {
          // Check if courseId is a master course, find linked institution programs
          const mcRes = await db.query(
            `SELECT name FROM master_courses WHERE id = $1 LIMIT 1`,
            [courseId]
          );
          if (mcRes.rows[0]) {
            const mcName = mcRes.rows[0].name;
            const res = await db.query(
              `SELECT css.id, css.course_id, css.subject_id, css.subject_name, css.subject_code, css.term_name, css.term_number, css.units, css.updated_at
               FROM course_subject_syllabi css
               JOIN institution_programs ip ON ip.id = css.course_id
               WHERE ip.master_course_id = $1 OR LOWER(TRIM(ip.title)) = LOWER(TRIM($2))
               ORDER BY css.id DESC`,
              [courseId, mcName]
            );
            rows = (res.rows || []).filter(r => Array.isArray(r.units) && r.units.length > 0);
          }
        }
      } catch (e) {
        console.warn("Cross-referencing course/program syllabus failed:", e);
      }
    }

    // Map existing rows by subject_id & normalized name
    const existingSubjectIds = new Set<string>();
    const existingSubjectNames = new Set<string>();
    rows.forEach((r) => {
      if (r.subject_id) existingSubjectIds.add(String(r.subject_id));
      if (r.subject_name) existingSubjectNames.add(r.subject_name.trim().toLowerCase());
    });

    // 3. If a specific subjectId / subjectName was requested, check if it's in rows or in course_subject_syllabi globally
    if (filterSubjectId || filterSubjectName) {
      const isMatched = rows.some((r) => {
        if (filterSubjectId && String(r.subject_id) === String(filterSubjectId)) return true;
        if (filterSubjectName && r.subject_name?.trim().toLowerCase() === filterSubjectName.toLowerCase()) return true;
        return false;
      });

      if (!isMatched) {
        // Query course_subject_syllabi globally for ANY course where this subject's syllabus was configured!
        try {
          const globalRes = await db.query(
            `SELECT id, course_id, subject_id, subject_name, subject_code, term_name, term_number, units, updated_at
             FROM course_subject_syllabi
             WHERE (LOWER(TRIM(subject_name)) = LOWER(TRIM($1))
                OR subject_id = $2
                OR LOWER(TRIM(subject_name)) LIKE LOWER(CONCAT('%', TRIM($1), '%'))
                OR LOWER(TRIM($1)) LIKE LOWER(CONCAT('%', TRIM(subject_name), '%')))
               AND jsonb_array_length(units) > 0
             ORDER BY jsonb_array_length(units) DESC, id DESC
             LIMIT 1`,
            [filterSubjectName || "", filterSubjectId || ""]
          );
          if (globalRes.rows[0]) {
            const gRow = globalRes.rows[0];
            rows.unshift({
              ...gRow,
              course_id: courseId,
              subject_id: filterSubjectId || gRow.subject_id,
              subject_name: filterSubjectName || gRow.subject_name,
            });
            existingSubjectIds.add(String(filterSubjectId || gRow.subject_id));
            existingSubjectNames.add((filterSubjectName || gRow.subject_name).trim().toLowerCase());
          }
        } catch (globErr) {
          console.warn("Global subject syllabus search failed:", globErr);
        }
      }
    }

    // 4. Query all subjects mapped to this course (from program_subjects or master_course_subjects)
    try {
      const subRes = await db.query(
        `
        SELECT s.id AS subject_id, s.name AS subject_name, s.code AS subject_code
        FROM program_subjects ps
        JOIN subjects s ON s.id = ps.subject_id
        WHERE ps.program_id = $1 AND COALESCE(s.is_deleted, FALSE) = FALSE
        UNION
        SELECT s.id AS subject_id, s.name AS subject_name, s.code AS subject_code
        FROM master_course_subjects mcs
        JOIN subjects s ON s.id = mcs.subject_id
        WHERE mcs.course_id = $1 AND COALESCE(s.is_deleted, FALSE) = FALSE
        ORDER BY subject_name ASC
        `,
        [courseId]
      );

      for (const sub of subRes.rows) {
        const subIdStr = String(sub.subject_id);
        const subNameLower = sub.subject_name.trim().toLowerCase();

        // If not already in rows with units, search if configured anywhere in course_subject_syllabi
        if (!existingSubjectIds.has(subIdStr) && !existingSubjectNames.has(subNameLower)) {
          let foundUnits: any = null;
          try {
            const fallbackRes = await db.query(
              `SELECT units FROM course_subject_syllabi
               WHERE (LOWER(TRIM(subject_name)) = LOWER(TRIM($1)) OR subject_id = $2)
                 AND jsonb_array_length(units) > 0
               ORDER BY jsonb_array_length(units) DESC, id DESC LIMIT 1`,
              [sub.subject_name, subIdStr]
            );
            if (fallbackRes.rows[0]?.units && Array.isArray(fallbackRes.rows[0].units)) {
              foundUnits = fallbackRes.rows[0].units;
            }
          } catch {
            // ignore
          }

          const units = foundUnits || generateDefaultSyllabusForSubject(sub.subject_id, sub.subject_name);
          rows.push({
            id: `gen-${sub.subject_id}`,
            course_id: courseId,
            subject_id: subIdStr,
            subject_name: sub.subject_name,
            subject_code: sub.subject_code,
            term_name: null,
            term_number: 1,
            units,
            updated_at: new Date().toISOString(),
          });
          existingSubjectIds.add(subIdStr);
          existingSubjectNames.add(subNameLower);
        }
      }
    } catch (subErr) {
      console.warn("Could not query program_subjects / master_course_subjects:", subErr);
    }

    // 5. If specific subject was requested and still not present, generate or search
    if (filterSubjectId || filterSubjectName) {
      const isMatched = rows.some((r) => {
        if (filterSubjectId && String(r.subject_id) === String(filterSubjectId)) return true;
        if (filterSubjectName && r.subject_name?.trim().toLowerCase() === filterSubjectName.toLowerCase()) return true;
        return false;
      });

      if (!isMatched) {
        const targetSubId = filterSubjectId || "1";
        const targetSubName = filterSubjectName || `Subject ${targetSubId}`;
        let foundUnits: any = null;
        try {
          const fallbackRes = await db.query(
            `SELECT units FROM course_subject_syllabi
             WHERE (LOWER(TRIM(subject_name)) = LOWER(TRIM($1)) OR subject_id = $2)
               AND jsonb_array_length(units) > 0
             ORDER BY jsonb_array_length(units) DESC, id DESC LIMIT 1`,
            [targetSubName, targetSubId]
          );
          if (fallbackRes.rows[0]?.units && Array.isArray(fallbackRes.rows[0].units)) {
            foundUnits = fallbackRes.rows[0].units;
          }
        } catch {
          // ignore
        }

        const generatedUnits = foundUnits || generateDefaultSyllabusForSubject(targetSubId, targetSubName);

        rows.push({
          id: `gen-${targetSubId}`,
          course_id: courseId,
          subject_id: String(targetSubId),
          subject_name: targetSubName,
          subject_code: null,
          term_name: null,
          term_number: 1,
          units: generatedUnits,
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Ensure all returned rows have non-empty units
    rows = rows.map((r) => {
      if (!Array.isArray(r.units) || r.units.length === 0) {
        return {
          ...r,
          units: generateDefaultSyllabusForSubject(r.subject_id, r.subject_name || "Subject"),
        };
      }
      return r;
    });

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error("GET /api/admin/content/courses/[id]/syllabus error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch syllabus" }, { status: 500 });
  }
}

// POST/PUT: Upsert syllabus for a course subject
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureCourseSyllabusTable();

    const { id } = await params;
    const courseId = Number(id);
    if (!courseId || isNaN(courseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    const body = await req.json();
    const { subjectId, subjectName, subjectCode, termName, termNumber, units } = body;

    if (!subjectId || !subjectName) {
      return NextResponse.json(
        { error: "Subject ID and Subject Name are required" },
        { status: 400 }
      );
    }

    const safeUnits = Array.isArray(units) && units.length > 0
      ? units
      : generateDefaultSyllabusForSubject(subjectId, subjectName);

    const res = await db.query(
      `INSERT INTO course_subject_syllabi 
        (course_id, subject_id, subject_name, subject_code, term_name, term_number, units, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
       ON CONFLICT (course_id, subject_id) 
       DO UPDATE SET 
         subject_name = EXCLUDED.subject_name,
         subject_code = EXCLUDED.subject_code,
         term_name = EXCLUDED.term_name,
         term_number = EXCLUDED.term_number,
         units = EXCLUDED.units,
         updated_at = NOW()
       RETURNING *`,
      [
        courseId,
        String(subjectId),
        subjectName.trim(),
        subjectCode?.trim() || null,
        termName?.trim() || null,
        termNumber ? Number(termNumber) : null,
        JSON.stringify(safeUnits),
      ]
    );

    return NextResponse.json({
      data: res.rows[0],
      message: "Syllabus saved successfully",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save syllabus" }, { status: 500 });
  }
}

// DELETE: Remove syllabus for a subject
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureCourseSyllabusTable();

    const { id } = await params;
    const courseId = Number(id);
    const url = new URL(req.url);
    const subjectId = url.searchParams.get("subjectId");

    if (!subjectId) {
      return NextResponse.json({ error: "subjectId query parameter is required" }, { status: 400 });
    }

    await db.query(
      `DELETE FROM course_subject_syllabi WHERE course_id = $1 AND subject_id = $2`,
      [courseId, String(subjectId)]
    );

    return NextResponse.json({ success: true, message: "Syllabus removed" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete syllabus" }, { status: 500 });
  }
}