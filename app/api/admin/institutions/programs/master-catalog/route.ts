import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureMasterCoursesTable } from "@/lib/queries/content-courses";

const CURATED_PLATFORM_MASTER_COURSES = [
  {
    name: "NEET Intensive Classroom Program",
    code: "NEET-MED-01",
    category_name: "Medical Entrance (NEET / AIIMS)",
    program_type_name: "Academic & Competitive Program",
    duration_value: 24,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "board",
    description: "Complete 2-year classroom preparation for NEET-UG with daily practice tests, PCB foundation, and expert medical faculty mentorship.",
    subjects: ["Physics", "Chemistry", "Biology / Botany", "Zoology"],
  },
  {
    name: "JEE Advanced & Main Elite Batch",
    code: "JEE-ENG-01",
    category_name: "Engineering Entrance (JEE / State CET)",
    program_type_name: "Academic & Competitive Program",
    duration_value: 24,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "board",
    description: "Comprehensive coaching for JEE Main & Advanced focusing on concept clarity, speed techniques, PCM problem solving, and mock simulations.",
    subjects: ["Physics", "Chemistry", "Mathematics"],
  },
  {
    name: "Class 9 Foundation (CBSE & State Board)",
    code: "SCH-09-FND",
    category_name: "Secondary School (Class 9-10)",
    program_type_name: "Academic Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 45,
    authority_type: "board",
    description: "Holistic academic curriculum designed to strengthen foundational STEM concepts and prepare students for competitive Olympiads.",
    subjects: ["Mathematics", "Science", "English", "Social Science"],
  },
  {
    name: "Class 10 Board Accelerator & Pre-Foundation",
    code: "SCH-10-BRD",
    category_name: "Secondary School (Class 9-10)",
    program_type_name: "Academic Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 45,
    authority_type: "board",
    description: "Board exam excellence batch covering complete CBSE/State syllabus, previous years questions, sample papers, and regular assessments.",
    subjects: ["Mathematics", "Science", "English", "Social Science", "Hindi / Regional"],
  },
  {
    name: "ADCA (Advance Diploma in Computer Applications)",
    code: "DIP-ADCA",
    category_name: "Information Technology & Computer Science",
    program_type_name: "Diploma / Certificate Program",
    duration_value: 12,
    duration_unit: "months",
    seats_available: 40,
    authority_type: "certification_provider",
    description: "Hands-on diploma program covering Office Automation, Database Management, Web Designing, Tally Prime accounting, and programming fundamentals.",
    subjects: ["Computer Fundamentals & OS", "MS Office & Advanced Excel", "Tally Prime ERP", "HTML / CSS & Web Basics", "Database (RDBMS)"],
  },
  {
    name: "BBA (Bachelor of Business Administration)",
    code: "DEG-BBA",
    category_name: "Commerce & Management",
    program_type_name: "Degree Program",
    duration_value: 36,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Undergraduate degree program building strong foundations in financial management, business analytics, marketing strategies, and organizational leadership.",
    subjects: ["Principles of Management", "Financial Accounting", "Marketing Management", "Business Law", "Organizational Behavior"],
  },
  {
    name: "BCA (Bachelor of Computer Applications)",
    code: "DEG-BCA",
    category_name: "Information Technology & Computer Science",
    program_type_name: "Degree Program",
    duration_value: 36,
    duration_unit: "months",
    seats_available: 60,
    authority_type: "university",
    description: "Industry-aligned undergraduate IT program emphasizing software engineering, full stack web development, data structures, and database systems.",
    subjects: ["C / C++ Programming", "Data Structures & Algorithms", "Database Management Systems", "Web Technologies", "Software Engineering"],
  },
  {
    name: "Full Stack Web Development (MERN / Next.js)",
    code: "TECH-FS-01",
    category_name: "Skill Development & Professional",
    program_type_name: "Course",
    duration_value: 6,
    duration_unit: "months",
    seats_available: 30,
    authority_type: "certification_provider",
    description: "Job-ready bootcamp covering modern web technologies: JavaScript, TypeScript, React, Next.js, Node.js, PostgreSQL, REST APIs, and project deployments.",
    subjects: ["Frontend Development (React / Tailwind)", "Backend & APIs (Node.js / Express)", "Databases (PostgreSQL / MongoDB)", "DevOps & Cloud Deployment"],
  },
  {
    name: "Spoken English & Professional Communication",
    code: "SKILL-ENG-01",
    category_name: "Language & Soft Skills",
    program_type_name: "Course",
    duration_value: 3,
    duration_unit: "months",
    seats_available: 35,
    authority_type: "certification_provider",
    description: "Interactive language training focusing on fluent conversational English, vocabulary building, public speaking, and corporate interview skills.",
    subjects: ["Everyday Spoken English", "Grammar & Vocabulary", "Professional Presentation Skills", "Interview Preparation & GD"],
  },
  {
    name: "UPSC Civil Services Foundation Program",
    code: "GOV-UPSC-01",
    category_name: "Government & Competitive Exams",
    program_type_name: "Academic & Competitive Program",
    duration_value: 18,
    duration_unit: "months",
    seats_available: 50,
    authority_type: "board",
    description: "Integrated prelims-cum-mains foundation course covering Indian Polity, History, Geography, Economy, Current Affairs, and Answer Writing practice.",
    subjects: ["Indian Polity & Governance", "Indian & World History", "Geography & Environment", "Indian Economy", "General Science & Current Affairs"],
  },
];

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureMasterCoursesTable(db);

    const url = new URL(req.url);
    const institutionId = url.searchParams.get("institutionId")
      ? Number(url.searchParams.get("institutionId"))
      : null;
    const search = url.searchParams.get("search")?.toLowerCase().trim() || "";

    // 1. Get existing programs of this institution so we can mark 'is_already_added'
    const existingTitlesSet = new Set<string>();
    if (institutionId) {
      const existingRes = await db.query<{ title: string }>(
        `SELECT LOWER(title) as title FROM institution_programs WHERE institution_id = $1 AND COALESCE(is_deleted, FALSE) = FALSE`,
        [institutionId]
      );
      existingRes.rows.forEach((r) => existingTitlesSet.add(r.title.trim().toLowerCase()));
    }

    // 2. Fetch master courses from database
    const dbMasterCoursesRes = await db.query(
      `
      SELECT
        mc.id,
        mc.name,
        mc.slug,
        mc.code,
        mc.category_id,
        c.name AS category_name,
        mc.authority_type,
        b.name AS board_name,
        mc.university_name,
        mc.duration_value,
        mc.duration_unit,
        mc.seats_available,
        mc.description,
        mc.thumbnail_url,
        mc.icon_url,
        (
          SELECT json_agg(json_build_object('id', s.id, 'name', s.name))
          FROM master_course_subjects mcs
          JOIN subjects s ON s.id = mcs.subject_id
          WHERE mcs.course_id = mc.id
        ) AS subjects
      FROM master_courses mc
      LEFT JOIN categories c ON c.id = mc.category_id
      LEFT JOIN boards b ON b.id = mc.board_id
      WHERE mc.is_deleted = FALSE AND mc.is_active = TRUE
      ORDER BY mc.name ASC
      `
    );

    const dbCourses = dbMasterCoursesRes.rows.map((c) => {
      const titleLower = (c.name || "").toLowerCase().trim();
      const subjectNames = Array.isArray(c.subjects) ? c.subjects.map((s: any) => s.name) : [];
      return {
        id: `db-course-${c.id}`,
        db_id: c.id,
        title: c.name,
        slug: c.slug,
        code: c.code || `CRS-${c.id}`,
        category_name: c.category_name || "General Academic",
        program_type_name: c.authority_type === "university" ? "Degree Program" : c.authority_type === "certification_provider" ? "Certificate Course" : "Academic Program",
        duration_value: c.duration_value || 12,
        duration_unit: c.duration_unit || "months",
        duration_text: `${c.duration_value || 12} ${c.duration_unit || "months"}`,
        seats_available: c.seats_available || 60,
        authority_type: c.authority_type || "board",
        board_name: c.board_name,
        university_name: c.university_name,
        description: c.description || "",
        thumbnail_url: c.thumbnail_url || c.icon_url || null,
        subjects: subjectNames,
        is_already_added: existingTitlesSet.has(titleLower),
        source: "database",
      };
    });

    // 3. Merge curated platform catalog templates (deduplicating by title)
    const allCourses = [...dbCourses];
    const seenTitles = new Set(dbCourses.map((c) => c.title.toLowerCase().trim()));

    for (let i = 0; i < CURATED_PLATFORM_MASTER_COURSES.length; i++) {
      const curated = CURATED_PLATFORM_MASTER_COURSES[i];
      const curTitleLower = curated.name.toLowerCase().trim();
      if (!seenTitles.has(curTitleLower)) {
        seenTitles.add(curTitleLower);
        allCourses.push({
          id: `curated-${i + 1}`,
          db_id: null,
          title: curated.name,
          slug: curated.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          code: curated.code,
          category_name: curated.category_name,
          program_type_name: curated.program_type_name,
          duration_value: curated.duration_value,
          duration_unit: curated.duration_unit,
          duration_text: `${curated.duration_value} ${curated.duration_unit}`,
          seats_available: curated.seats_available,
          authority_type: curated.authority_type,
          board_name: null,
          university_name: null,
          description: curated.description,
          thumbnail_url: null,
          subjects: curated.subjects,
          is_already_added: existingTitlesSet.has(curTitleLower),
          source: "curated",
        });
      }
    }

    // 4. Filter by search query if present
    const filteredCourses = search
      ? allCourses.filter(
          (c) =>
            c.title.toLowerCase().includes(search) ||
            c.code.toLowerCase().includes(search) ||
            c.category_name.toLowerCase().includes(search) ||
            c.subjects.some((s: string) => s.toLowerCase().includes(search))
        )
      : allCourses;

    return NextResponse.json({
      data: filteredCourses,
      total: filteredCourses.length,
      available_count: filteredCourses.filter((c) => !c.is_already_added).length,
      added_count: filteredCourses.filter((c) => c.is_already_added).length,
    });
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to fetch master catalog" }, { status });
  }
}
