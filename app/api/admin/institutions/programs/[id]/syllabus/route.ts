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

function mapUnitsToEditableNodes(
  units: any[],
  subjectId: string | number,
  subjectName: string,
  prefix = "master"
) {
  if (!Array.isArray(units) || units.length === 0) return [];

  return units.map((u: any, uIdx: number) => {
    const unitNum = u.unit_number ?? uIdx + 1;
    const unitId = u.id ? String(u.id) : `${prefix}-unit-${unitNum}-${Date.now()}-${uIdx}`;
    const unitTitle = u.title?.trim() || `Unit ${unitNum}`;
    const unitDesc = u.description || "";

    const chapters = (u.chapters || []).map((c: any, cIdx: number) => {
      const chapNum = c.chapter_number ?? `${unitNum}.${cIdx + 1}`;
      const chapId = c.id ? String(c.id) : `${prefix}-chap-${chapNum}-${Date.now()}-${cIdx}`;
      const chapTitle = c.title?.trim() || `Chapter ${chapNum}`;
      const chapDesc = c.description || "";
      const chapHours = c.estimated_hours != null ? Number(c.estimated_hours) : null;

      const topics = (c.lessons || c.topics || c.children || []).map((t: any, tIdx: number) => {
        const topNum = t.lesson_number ?? t.topic_number ?? `${chapNum}.${tIdx + 1}`;
        const topId = t.id ? String(t.id) : `${prefix}-top-${topNum}-${Date.now()}-${tIdx}`;
        const topTitle = t.title?.trim() || `Topic ${topNum}`;
        const topDesc = t.description || "";
        const topHours = t.duration_mins
          ? Math.round(Number(t.duration_mins) / 60) || 1
          : (t.estimated_hours != null ? Number(t.estimated_hours) : null);

        return {
          id: topId,
          subject_id: subjectId,
          subject_name: subjectName,
          title: topTitle,
          description: topDesc,
          node_type: "topic" as const,
          estimated_hours: topHours,
          learning_outcomes: t.learning_outcomes || "",
          sort_order: tIdx * 10,
        };
      });

      return {
        id: chapId,
        subject_id: subjectId,
        subject_name: subjectName,
        title: chapTitle,
        description: chapDesc,
        node_type: "chapter" as const,
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
      id: unitId,
      subject_id: subjectId,
      subject_name: subjectName,
      title: unitTitle,
      description: unitDesc,
      node_type: "unit" as const,
      estimated_hours: unitHours,
      sort_order: uIdx * 10,
      children: chapters,
    };
  });
}

// Convert EditableSyllabusTopic hierarchy back to UnitNode[] JSON
function mapEditableNodesToUnits(nodes: any[]) {
  if (!Array.isArray(nodes)) return [];

  return nodes.map((unit: any, uIdx: number) => {
    const chapters = (unit.children || []).map((chap: any, cIdx: number) => {
      const lessons = (chap.children || []).map((top: any, tIdx: number) => ({
        id: top.id || `topic-${Date.now()}-${tIdx}`,
        lesson_number: `${uIdx + 1}.${cIdx + 1}.${tIdx + 1}`,
        title: top.title || "",
        description: top.description || "",
        duration_mins: top.estimated_hours ? Number(top.estimated_hours) * 60 : undefined,
        learning_outcomes: top.learning_outcomes || "",
      }));

      return {
        id: chap.id || `chap-${Date.now()}-${cIdx}`,
        chapter_number: `${uIdx + 1}.${cIdx + 1}`,
        title: chap.title || "",
        description: chap.description || "",
        estimated_hours: chap.estimated_hours ? String(chap.estimated_hours) : undefined,
        lessons,
      };
    });

    return {
      id: unit.id || `unit-${Date.now()}-${uIdx}`,
      unit_number: uIdx + 1,
      title: unit.title || "",
      description: unit.description || "",
      estimated_hours: unit.estimated_hours ? String(unit.estimated_hours) : undefined,
      chapters,
    };
  });
}

// GET: Fetch master syllabus for an institution program & its subjects
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
    const programId = Number(id);
    if (!programId || isNaN(programId)) {
      return NextResponse.json({ error: "Invalid program ID" }, { status: 400 });
    }

    const url = new URL(req.url);
    const filterSubjectId = url.searchParams.get("subjectId")?.trim();
    const filterSubjectName = url.searchParams.get("subjectName")?.trim();

    try {
      await ensureCourseSyllabusTable();
    } catch {
      // Table may already exist
    }

    // 1. Fetch Program Info to match Course
    let programTitle = "";
    let resolvedCourseId: number | null = null;

    try {
      const progRes = await db.query(
        `SELECT id, title FROM institution_programs WHERE id = $1 LIMIT 1`,
        [programId]
      );
      if (progRes.rows[0]) {
        programTitle = (progRes.rows[0].title || "").trim();
      }
    } catch (e) {
      console.warn("Could not fetch institution program title:", e);
    }

    // Match master course by title
    if (programTitle) {
      try {
        const mcRes = await db.query(
          `SELECT id, name FROM master_courses 
           WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) 
              OR LOWER(TRIM($1)) LIKE LOWER(CONCAT('%', TRIM(name), '%'))
              OR LOWER(TRIM(name)) LIKE LOWER(CONCAT('%', TRIM($1), '%'))
           LIMIT 1`,
          [programTitle]
        );
        if (mcRes.rows[0]) {
          resolvedCourseId = mcRes.rows[0].id;
        }
      } catch (e) {
        console.warn("Could not match master course by program title:", e);
      }
    }

    // 2. Fetch all program subjects
    let programSubjects: { id: number; name: string; code?: string }[] = [];
    try {
      const subRes = await db.query(
        `SELECT s.id, s.name, s.code
         FROM program_subjects ps
         JOIN subjects s ON s.id = ps.subject_id
         WHERE ps.program_id = $1 AND COALESCE(s.is_deleted, FALSE) = FALSE
         ORDER BY s.name ASC`,
        [programId]
      );
      programSubjects = subRes.rows || [];
    } catch (e) {
      console.warn("Could not query program_subjects:", e);
    }

    // 3. Query course_subject_syllabi for the resolved course or fallback
    let syllabiRows: any[] = [];
    if (resolvedCourseId) {
      try {
        const sylRes = await db.query(
          `SELECT id, course_id, subject_id, subject_name, subject_code, term_name, term_number, units, updated_at
           FROM course_subject_syllabi
           WHERE course_id = $1
           ORDER BY term_number ASC, subject_name ASC`,
          [resolvedCourseId]
        );
        syllabiRows = sylRes.rows || [];
      } catch (e) {
        console.warn("Could not query course_subject_syllabi by course_id:", e);
      }
    }

    // Also query by subject_id or subject_name if course match yielded nothing
    if (syllabiRows.length === 0 && (filterSubjectId || filterSubjectName || programSubjects.length > 0)) {
      const targetSubIds = filterSubjectId ? [filterSubjectId] : programSubjects.map(s => String(s.id));
      const targetSubNames = filterSubjectName ? [filterSubjectName.toLowerCase()] : programSubjects.map(s => s.name.toLowerCase());

      try {
        const fallbackRes = await db.query(
          `SELECT id, course_id, subject_id, subject_name, subject_code, term_name, term_number, units, updated_at
           FROM course_subject_syllabi
           WHERE subject_id = ANY($1::varchar[]) OR LOWER(TRIM(subject_name)) = ANY($2::text[])
           ORDER BY id DESC`,
          [targetSubIds, targetSubNames]
        );
        syllabiRows = fallbackRes.rows || [];
      } catch (e) {
        console.warn("Could not query course_subject_syllabi fallback:", e);
      }
    }

    // 4. Map into structured EditableSyllabusTopic[]
    let allNodes: any[] = [];
    const populatedSubjectIds = new Set<string>();
    const populatedSubjectNames = new Set<string>();

    for (const r of syllabiRows) {
      const sId = String(r.subject_id);
      const sName = r.subject_name || "Subject";
      const mappedNodes = mapUnitsToEditableNodes(r.units, sId, sName, `master-${r.id}`);
      allNodes = [...allNodes, ...mappedNodes];
      populatedSubjectIds.add(sId);
      populatedSubjectNames.add(sName.trim().toLowerCase());
    }

    // 5. For program subjects that don't have custom master syllabus yet, generate structured units
    for (const sub of programSubjects) {
      const sId = String(sub.id);
      const sName = sub.name;
      if (!populatedSubjectIds.has(sId) && !populatedSubjectNames.has(sName.trim().toLowerCase())) {
        const generatedUnits = generateDefaultSyllabusForSubject(sub.id, sub.name);
        const mappedGenerated = mapUnitsToEditableNodes(generatedUnits, sId, sName, `gen-${sub.id}`);
        allNodes = [...allNodes, ...mappedGenerated];
        populatedSubjectIds.add(sId);
        populatedSubjectNames.add(sName.trim().toLowerCase());
      }
    }

    // If a specific subject was queried and not yet populated
    if (filterSubjectId && !populatedSubjectIds.has(filterSubjectId)) {
      const subName = filterSubjectName || `Subject ${filterSubjectId}`;
      const generatedUnits = generateDefaultSyllabusForSubject(filterSubjectId, subName);
      const mappedGenerated = mapUnitsToEditableNodes(generatedUnits, filterSubjectId, subName, `gen-${filterSubjectId}`);
      allNodes = [...allNodes, ...mappedGenerated];
    }

    return NextResponse.json({
      data: allNodes,
      rawRecords: syllabiRows,
      courseId: resolvedCourseId,
      programTitle,
      programSubjects,
    });
  } catch (err: any) {
    console.error("GET /api/admin/institutions/programs/[id]/syllabus error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch program syllabus" },
      { status: 500 }
    );
  }
}

// POST: Save or update syllabus for a program's subject
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
    const programId = Number(id);
    if (!programId || isNaN(programId)) {
      return NextResponse.json({ error: "Invalid program ID" }, { status: 400 });
    }

    const body = await req.json();
    const { subjectId, subjectName, subjectCode, termName, termNumber, syllabusNodes, units } = body;

    if (!subjectId || !subjectName) {
      return NextResponse.json(
        { error: "Subject ID and Subject Name are required" },
        { status: 400 }
      );
    }

    // Resolve course ID
    let courseId = Number(body.courseId);
    if (!courseId || isNaN(courseId)) {
      const progRes = await db.query(
        `SELECT id, title FROM institution_programs WHERE id = $1 LIMIT 1`,
        [programId]
      );
      if (progRes.rows[0]?.title) {
        const mcRes = await db.query(
          `SELECT id FROM master_courses WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
          [progRes.rows[0].title.trim()]
        );
        if (mcRes.rows[0]) {
          courseId = mcRes.rows[0].id;
        }
      }
    }

    if (!courseId) {
      // Use programId as fallback course key
      courseId = programId;
    }

    const convertedUnits = Array.isArray(units) && units.length > 0
      ? units
      : (Array.isArray(syllabusNodes) ? mapEditableNodesToUnits(syllabusNodes) : generateDefaultSyllabusForSubject(subjectId, subjectName));

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
        termNumber ? Number(termNumber) : 1,
        JSON.stringify(convertedUnits),
      ]
    );

    return NextResponse.json({
      data: res.rows[0],
      message: "Syllabus saved successfully",
    });
  } catch (err: any) {
    console.error("POST /api/admin/institutions/programs/[id]/syllabus error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save syllabus" },
      { status: 500 }
    );
  }
}
